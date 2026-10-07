import type pg from 'pg';
import { resolveRows, type AliasRef, type Anomaly, type ComunaRef } from './normalize.js';
import type { SecFetcher } from './sec/client.js';
import type { SecRow } from './sec/schema.js';
import { localHourToUtc, type LocalHour } from './time.js';

export const SOURCE = 'sec';

export type RunStatus = 'success' | 'partial' | 'failed';

export interface IngestOptions {
  /** true si la hora ya cerró y este es su valor definitivo (D-010). */
  isFinal: boolean;
}

export interface IngestSummary {
  runId: number;
  periodStart: Date;
  status: RunStatus;
  rowsReceived: number;
  comunasAfectadas: number;
  clientesTotal: number;
  anomalies: number;
  /** Motivo del fallo, si lo hubo ('empty_response' = la SEC no devolvió datos). */
  error?: string;
}

export interface Refs {
  aliases: AliasRef[];
  comunas: ComunaRef[];
}

export async function loadRefs(db: pg.Pool | pg.PoolClient): Promise<Refs> {
  const [aliases, comunas] = await Promise.all([
    db.query<AliasRef>(`SELECT raw_region, raw_comuna, cut FROM comuna_aliases WHERE source = $1`, [SOURCE]),
    db.query<ComunaRef>(`SELECT cut, nombre FROM comunas`),
  ]);
  return { aliases: aliases.rows, comunas: comunas.rows };
}

/**
 * Estado de una ejecución según sus anomalías (D-012):
 * - 'partial' solo si hay filas que requieren acción humana (nombres sin traducir).
 * - Las filas sin nombre (empty_name) son un defecto conocido de la fuente:
 *   se registran, pero no marcan la hora como parcial.
 */
export function statusFor(anomalies: Anomaly[]): RunStatus {
  return anomalies.some((a) => a.kind === 'unresolved') ? 'partial' : 'success';
}

export interface ResolvedHour {
  byCut: Map<string, number>;
  anomalies: Anomaly[];
  status: RunStatus;
}

export function resolveHour(rows: SecRow[], refs: Refs): ResolvedHour {
  const { byCut, anomalies } = resolveRows(rows, refs.aliases, refs.comunas);
  return { byCut, anomalies, status: statusFor(anomalies) };
}

/** Escribe una hora ya resuelta: hourly_outages (upsert + borrado de ceros) y fetched_hours. */
export async function writeHour(
  client: pg.PoolClient,
  periodStart: Date,
  byCut: Map<string, number>,
  isFinal: boolean,
): Promise<void> {
  const cuts = [...byCut.keys()];
  const values = [...byCut.values()];
  // Mejor valor conocido; cuenta una revisión solo si el valor cambió (D-010).
  await client.query(
    `INSERT INTO hourly_outages (source, cut, period_start, clientes_afectados)
     SELECT $1, u.cut, $2, u.clientes FROM unnest($3::text[], $4::int[]) AS u(cut, clientes)
     ON CONFLICT (source, cut, period_start) DO UPDATE SET
       clientes_afectados = EXCLUDED.clientes_afectados,
       updated_at = now(),
       revisions = hourly_outages.revisions
         + CASE WHEN hourly_outages.clientes_afectados <> EXCLUDED.clientes_afectados THEN 1 ELSE 0 END`,
    [SOURCE, periodStart, cuts, values],
  );
  // Las comunas que ya no aparecen en esta hora volvieron a 0.
  await client.query(
    `DELETE FROM hourly_outages WHERE source = $1 AND period_start = $2 AND NOT (cut = ANY($3::text[]))`,
    [SOURCE, periodStart, cuts],
  );
  await client.query(
    `INSERT INTO fetched_hours (source, period_start, last_fetched_at, is_final) VALUES ($1, $2, now(), $3)
     ON CONFLICT (source, period_start) DO UPDATE SET
       last_fetched_at = now(),
       is_final = fetched_hours.is_final OR EXCLUDED.is_final`,
    [SOURCE, periodStart, isFinal],
  );
}

const sumValues = (m: Map<string, number>) => [...m.values()].reduce((a, b) => a + b, 0);

/** Ingresa una hora completa: crudo → resolución de nombres → hourly_outages + fetched_hours. */
export async function ingestHour(
  pool: pg.Pool,
  fetcher: SecFetcher,
  hour: LocalHour,
  opts: IngestOptions,
): Promise<IngestSummary> {
  const periodStart = localHourToUtc(hour);
  const { rows: runRows } = await pool.query<{ id: string }>(
    `INSERT INTO ingestion_runs (source, kind) VALUES ($1, 'fetch') RETURNING id`,
    [SOURCE],
  );
  const runId = Number(runRows[0].id);
  const failed = (error: string): IngestSummary => ({
    runId, periodStart, status: 'failed', rowsReceived: 0, comunasAfectadas: 0, clientesTotal: 0, anomalies: 0, error,
  });
  const markFailed = (error: string) =>
    pool.query(`UPDATE ingestion_runs SET status = 'failed', finished_at = now(), error = $2 WHERE id = $1`, [
      runId,
      error,
    ]);

  let result;
  try {
    result = await fetcher(hour);
  } catch (err) {
    await markFailed(String(err));
    return failed(String(err));
  }

  // Una respuesta vacía para todo Chile no significa "cero cortes": significa "sin datos".
  // No se marca la hora como consultada, para no inventar ceros.
  if (result.rows.length === 0) {
    await markFailed('empty_response');
    return failed('empty_response');
  }

  const { byCut, anomalies, status } = resolveHour(result.rows, await loadRefs(pool));

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO raw_responses (run_id, source, period_start, payload) VALUES ($1, $2, $3, $4)`,
      [runId, SOURCE, periodStart, JSON.stringify(result.raw)],
    );
    await writeHour(client, periodStart, byCut, opts.isFinal);
    await client.query(
      `UPDATE ingestion_runs
       SET status = $2, finished_at = now(), http_status = $3, rows_received = $4, error = $5
       WHERE id = $1`,
      [runId, status, result.httpStatus, result.rows.length, anomalies.length ? JSON.stringify(anomalies) : null],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    await markFailed(String(err));
    throw err;
  } finally {
    client.release();
  }

  return {
    runId,
    periodStart,
    status,
    rowsReceived: result.rows.length,
    comunasAfectadas: byCut.size,
    clientesTotal: sumValues(byCut),
    anomalies: anomalies.length,
  };
}
