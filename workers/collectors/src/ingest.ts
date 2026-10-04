import type pg from 'pg';
import { resolveRows, type AliasRef, type ComunaRef } from './normalize.js';
import type { SecFetcher } from './sec/client.js';
import { localHourToUtc, type LocalHour } from './time.js';

const SOURCE = 'sec';

export interface IngestOptions {
  /** true si la hora ya cerró y este es su valor definitivo (D-010). */
  isFinal: boolean;
}

export interface IngestSummary {
  runId: number;
  periodStart: Date;
  status: 'success' | 'partial' | 'failed';
  rowsReceived: number;
  comunasAfectadas: number;
  clientesTotal: number;
  anomalies: number;
}

/** Ingresa una hora completa: crudo → resolución de nombres → hourly_outages + fetched_hours. */
export async function ingestHour(
  pool: pg.Pool,
  fetcher: SecFetcher,
  hour: LocalHour,
  opts: IngestOptions,
): Promise<IngestSummary> {
  const periodStart = localHourToUtc(hour);
  const { rows: runRows } = await pool.query<{ id: string }>(
    `INSERT INTO ingestion_runs (source) VALUES ($1) RETURNING id`,
    [SOURCE],
  );
  const runId = Number(runRows[0].id);
  const failed = (rowsReceived = 0): IngestSummary => ({
    runId, periodStart, status: 'failed', rowsReceived, comunasAfectadas: 0, clientesTotal: 0, anomalies: 0,
  });

  let result;
  try {
    result = await fetcher(hour);
  } catch (err) {
    await pool.query(
      `UPDATE ingestion_runs SET status = 'failed', finished_at = now(), error = $2 WHERE id = $1`,
      [runId, String(err)],
    );
    return failed();
  }

  const [aliases, comunas] = await Promise.all([
    pool.query<AliasRef>(`SELECT raw_region, raw_comuna, cut FROM comuna_aliases WHERE source = $1`, [SOURCE]),
    pool.query<ComunaRef>(`SELECT cut, nombre FROM comunas`),
  ]);
  const { byCut, anomalies } = resolveRows(result.rows, aliases.rows, comunas.rows);
  const hardAnomalies = anomalies.filter((a) => a.kind !== 'resolved_by_normalization');
  const status = hardAnomalies.length > 0 ? 'partial' : 'success';
  const cuts = [...byCut.keys()];
  const values = [...byCut.values()];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO raw_responses (run_id, source, period_start, payload) VALUES ($1, $2, $3, $4)`,
      [runId, SOURCE, periodStart, JSON.stringify(result.raw)],
    );
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
      [SOURCE, periodStart, opts.isFinal],
    );
    await client.query(
      `UPDATE ingestion_runs
       SET status = $2, finished_at = now(), http_status = $3, rows_received = $4, error = $5
       WHERE id = $1`,
      [runId, status, result.httpStatus, result.rows.length, anomalies.length ? JSON.stringify(anomalies) : null],
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    await pool.query(
      `UPDATE ingestion_runs SET status = 'failed', finished_at = now(), error = $2 WHERE id = $1`,
      [runId, String(err)],
    );
    throw err;
  } finally {
    client.release();
  }

  return {
    runId,
    periodStart,
    status,
    rowsReceived: result.rows.length,
    comunasAfectadas: cuts.length,
    clientesTotal: values.reduce((a, b) => a + b, 0),
    anomalies: anomalies.length,
  };
}
