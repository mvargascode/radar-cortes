import { parseArgs } from 'node:util';
import { config } from './config.js';
import { pool } from './db.js';
import { ingestHour } from './ingest.js';
import { fetchSecHour } from './sec/client.js';
import { formatLocalHour, toLocalHour, type LocalHour } from './time.js';

/** Cuántas horas cerradas se vuelven a consultar en cada ciclo (D-010). */
const RECHECK_HOURS = 2;

async function runOne(hour: LocalHour, isFinal: boolean) {
  const s = await ingestHour(pool, fetchSecHour, hour, { isFinal });
  console.log(
    `[${new Date().toISOString()}] ${formatLocalHour(hour)} → ${s.status} | run ${s.runId} | ` +
      `${s.comunasAfectadas} comunas | ${s.clientesTotal} clientes | anomalías: ${s.anomalies}` +
      (isFinal ? ' | final' : ' | en vivo'),
  );
}

/** Un ciclo: las horas recién cerradas (definitivas) + la hora en curso (en vivo). */
async function cycle() {
  const now = Date.now();
  for (let i = RECHECK_HOURS; i >= 0; i--) {
    await runOne(toLocalHour(new Date(now - i * 3600_000)), i > 0);
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      date: { type: 'string' }, // AAAA-MM-DD (hora local de Chile)
      hour: { type: 'string' }, // 0-23
      watch: { type: 'boolean', default: false },
    },
  });

  if (values.date) {
    const [anho, mes, dia] = values.date.split('-').map(Number);
    await runOne({ anho, mes, dia, hora: Number(values.hour ?? 0) }, true);
  } else if (values.watch) {
    console.log(`Modo watch: un ciclo cada ${config.watchIntervalMin} min. Ctrl+C para detener.`);
    await cycle();
    setInterval(() => cycle().catch((e) => console.error(e)), config.watchIntervalMin * 60_000);
    return; // el proceso queda vivo
  } else {
    await cycle();
  }
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
