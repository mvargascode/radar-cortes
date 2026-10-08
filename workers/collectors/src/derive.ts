import { parseArgs } from 'node:util';
import { pool } from './db.js';
import { DEFAULT_RULES } from './incidents.js';
import { deriveAll, notifyUpdate } from './incidents-store.js';

/**
 * Recalcula todos los incidentes (D-014). Los ids se mantienen estables (upsert).
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
  const dryRun = values['dry-run'];
  console.log(`Derivando incidentes (umbral ${rules.openThreshold})${dryRun ? ' — dry run' : ''}...`);
  const s = await deriveAll(pool, rules, { dryRun });
  console.log(`Resultado: ${s.total} incidentes (${s.open} abiertos) en ${s.seconds.toFixed(1)} s.`);
  if (!dryRun) await notifyUpdate(pool);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
