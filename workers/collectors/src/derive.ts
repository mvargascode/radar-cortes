import { parseArgs } from 'node:util';
import { pool } from './db.js';
import { DEFAULT_RULES, deriveIncidents, type DerivedIncident, type HourPoint } from './incidents.js';
import { SOURCE } from './ingest.js';

/**
 * Recalcula TODOS los incidentes de electricidad de la SEC desde hourly_outages (D-014).
 * Es idempotente: borra y vuelve a insertar dentro de una transacción.
 *
 * --threshold N   umbral de apertura (por defecto 500)
 * --dry-run       calcula y muestra el resumen, sin escribir
 */
async function main() {
  const { values } = parseArgs({
    options: {
      threshold: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const rules = { ...DEFAULT_RULES, openThreshold: Number(values.threshold ?? DEFAULT_RULES.openThreshold) };
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

  console.log(
    `Derivando incidentes: ${hours.length} horas, ${cuts.length} comunas con algún valor >= ${rules.openThreshold}.`,
  );

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

  const active = all.filter((x) => x.inc.status !== 'RESTORED').length;
  console.log(`Resultado: ${all.length} incidentes (${active} abiertos) en ${((Date.now() - t0) / 1000).toFixed(1)} s.`);

  if (!values['dry-run']) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM incidents WHERE source = $1 AND type = 'POWER_OUTAGE'`, [SOURCE]);
      for (let i = 0; i < all.length; i += 1000) {
        const batch = all.slice(i, i + 1000);
        await client.query(
          `INSERT INTO incidents (type, source_type, status, source, cut, started_at, ended_at,
                                  peak_clientes, peak_at, cliente_horas)
           SELECT 'POWER_OUTAGE', 'UNKNOWN', u.status, $1, u.cut, u.started_at, u.ended_at,
                  u.peak, u.peak_at, u.ch
           FROM unnest($2::text[], $3::text[], $4::timestamptz[], $5::timestamptz[], $6::int[],
                       $7::timestamptz[], $8::bigint[])
                AS u(status, cut, started_at, ended_at, peak, peak_at, ch)`,
          [
            SOURCE,
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
      await client.query('COMMIT');
      console.log('Incidentes guardados.');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
