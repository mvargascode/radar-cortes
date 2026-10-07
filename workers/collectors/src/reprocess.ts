import { parseArgs } from 'node:util';
import { pool } from './db.js';
import { loadRefs, resolveHour, SOURCE, writeHour } from './ingest.js';
import { secResponseSchema } from './sec/schema.js';
import { formatLocalHour, toLocalHour } from './time.js';

/**
 * Reprocesa horas desde raw_responses, sin consultar a la SEC.
 * Útil después de agregar alias: recalcula hourly_outages con la tabla de alias actual.
 *
 * Por defecto toma las horas cuya ÚLTIMA ejecución quedó 'partial'.
 * --all reprocesa todas las horas con respuesta cruda.
 * --dry-run solo muestra qué haría.
 *
 * Ejecutar con el backfill detenido, para no competir por las mismas horas.
 */
async function main() {
  const { values } = parseArgs({
    options: {
      all: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  // Última respuesta cruda de cada hora, con el estado de su ejecución.
  const { rows: candidates } = await pool.query<{ period_start: Date; raw_id: string; status: string }>(
    `SELECT * FROM (
       SELECT DISTINCT ON (r.period_start) r.period_start, r.id AS raw_id, i.status
       FROM raw_responses r JOIN ingestion_runs i ON i.id = r.run_id
       WHERE r.source = $1
       ORDER BY r.period_start, r.fetched_at DESC
     ) latest
     WHERE $2 OR status = 'partial'
     ORDER BY period_start`,
    [SOURCE, values.all],
  );

  console.log(`Reproceso: ${candidates.length} horas${values.all ? ' (todas)' : " con última ejecución 'partial'"}.`);
  if (values['dry-run'] || candidates.length === 0) {
    await pool.end();
    return;
  }

  const refs = await loadRefs(pool);
  const tally = { success: 0, partial: 0 };

  for (const c of candidates) {
    const { rows } = await pool.query<{ payload: unknown }>(`SELECT payload FROM raw_responses WHERE id = $1`, [
      c.raw_id,
    ]);
    const secRows = secResponseSchema.parse(rows[0].payload);
    const { byCut, anomalies, status } = resolveHour(secRows, refs);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Se registra como una ejecución nueva de tipo 'reprocess' que apunta al mismo crudo.
      const { rows: run } = await client.query<{ id: string }>(
        `INSERT INTO ingestion_runs (source, kind, status, finished_at, rows_received, error)
         VALUES ($1, 'reprocess', $2, now(), $3, $4) RETURNING id`,
        [SOURCE, status, secRows.length, anomalies.length ? JSON.stringify(anomalies) : null],
      );
      await client.query(`UPDATE raw_responses SET run_id = $2 WHERE id = $1`, [c.raw_id, run[0].id]);
      await writeHour(client, c.period_start, byCut, false); // false: conserva el is_final existente
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    tally[status === 'partial' ? 'partial' : 'success']++;
    if (status === 'partial') {
      console.log(`  ${formatLocalHour(toLocalHour(c.period_start))} sigue 'partial': ${JSON.stringify(anomalies)}`);
    }
  }

  console.log(`Listo: ${tally.success} horas ahora 'success', ${tally.partial} siguen 'partial'.`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
