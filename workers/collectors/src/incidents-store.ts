import type pg from 'pg';
import { DEFAULT_RULES, deriveIncidents, type DerivedIncident, type HourPoint, type IncidentRules } from './incidents.js';
import { SOURCE } from './ingest.js';

/** Canal de PostgreSQL que avisa a la API que hay datos nuevos (LISTEN/NOTIFY). */
export const UPDATES_CHANNEL = 'radar_updates';

export interface DeriveSummary {
  total: number;
  open: number;
  seconds: number;
}

/**
 * Recalcula todos los incidentes de la SEC desde hourly_outages (D-014) y los guarda
 * con upsert sobre (source, type, cut, started_at): los ids se mantienen estables.
 * Los incidentes que ya no existen con las reglas actuales se eliminan.
 */
export async function deriveAll(
  pool: pg.Pool,
  rules: IncidentRules = DEFAULT_RULES,
  opts: { dryRun?: boolean } = {},
): Promise<DeriveSummary> {
  const t0 = Date.now();
  const hours = (
    await pool.query<{ period_start: Date }>(
      `SELECT period_start FROM fetched_hours WHERE source = $1 ORDER BY period_start`,
      [SOURCE],
    )
  ).rows.map((r) => r.period_start);

  const cuts = (
    await pool.query<{ cut: string }>(
      `SELECT DISTINCT cut FROM hourly_outages WHERE source = $1 AND clientes_afectados >= $2 ORDER BY cut`,
      [SOURCE, rules.openThreshold],
    )
  ).rows.map((r) => r.cut);

  const all: { cut: string; inc: DerivedIncident }[] = [];
  for (const cut of cuts) {
    const { rows } = await pool.query<{ period_start: Date; clientes_afectados: number }>(
      `SELECT period_start, clientes_afectados FROM hourly_outages WHERE source = $1 AND cut = $2`,
      [SOURCE, cut],
    );
    const byTime = new Map(rows.map((r) => [r.period_start.getTime(), r.clientes_afectados]));
    const points: HourPoint[] = hours.map((t) => ({ t, value: byTime.get(t.getTime()) ?? 0 }));
    for (const inc of deriveIncidents(points, rules)) all.push({ cut, inc });
  }

  if (!opts.dryRun) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `CREATE TEMP TABLE new_incidents (
           status text, cut text, started_at timestamptz, ended_at timestamptz,
           peak_clientes int, peak_at timestamptz, cliente_horas bigint
         ) ON COMMIT DROP`,
      );
      for (let i = 0; i < all.length; i += 1000) {
        const batch = all.slice(i, i + 1000);
        await client.query(
          `INSERT INTO new_incidents
           SELECT * FROM unnest($1::text[], $2::text[], $3::timestamptz[], $4::timestamptz[],
                                $5::int[], $6::timestamptz[], $7::bigint[])`,
          [
            batch.map((x) => x.inc.status),
            batch.map((x) => x.cut),
            batch.map((x) => x.inc.startedAt),
            batch.map((x) => x.inc.endedAt),
            batch.map((x) => x.inc.peakClientes),
            batch.map((x) => x.inc.peakAt),
            batch.map((x) => x.inc.clienteHoras),
          ],
        );
      }
      await client.query(
        `INSERT INTO incidents (type, source_type, status, source, cut, started_at, ended_at,
                                peak_clientes, peak_at, cliente_horas)
         SELECT 'POWER_OUTAGE', 'UNKNOWN', n.status, $1, n.cut, n.started_at, n.ended_at,
                n.peak_clientes, n.peak_at, n.cliente_horas
         FROM new_incidents n
         ON CONFLICT (source, type, cut, started_at) DO UPDATE SET
           status = EXCLUDED.status,
           ended_at = EXCLUDED.ended_at,
           peak_clientes = EXCLUDED.peak_clientes,
           peak_at = EXCLUDED.peak_at,
           cliente_horas = EXCLUDED.cliente_horas,
           updated_at = now()
         WHERE (incidents.status, incidents.ended_at, incidents.peak_clientes, incidents.peak_at,
                incidents.cliente_horas)
               IS DISTINCT FROM
               (EXCLUDED.status, EXCLUDED.ended_at, EXCLUDED.peak_clientes, EXCLUDED.peak_at,
                EXCLUDED.cliente_horas)`,
        [SOURCE],
      );
      await client.query(
        `DELETE FROM incidents i
         WHERE i.source = $1 AND i.type = 'POWER_OUTAGE'
           AND NOT EXISTS (SELECT 1 FROM new_incidents n WHERE n.cut = i.cut AND n.started_at = i.started_at)`,
        [SOURCE],
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    total: all.length,
    open: all.filter((x) => x.inc.status !== 'RESTORED').length,
    seconds: (Date.now() - t0) / 1000,
  };
}

/** Avisa a quien escuche (la API) que hay datos nuevos. */
export async function notifyUpdate(pool: pg.Pool): Promise<void> {
  await pool.query(`SELECT pg_notify($1, $2)`, [UPDATES_CHANNEL, new Date().toISOString()]);
}
