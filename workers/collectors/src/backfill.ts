import { parseArgs } from 'node:util';
import { pool } from './db.js';
import { hourKey, listHoursBackward } from './backfill-plan.js';
import { ingestHour } from './ingest.js';
import { fetchSecHour } from './sec/client.js';
import { formatLocalHour, localHourToUtc, toLocalHour, type LocalHour } from './time.js';

/**
 * Backfill gradual del historial de la SEC (D-011).
 * - Recorre de la hora más reciente a la más antigua.
 * - Salta las horas que ya están como definitivas en fetched_hours (se puede pausar y retomar).
 * - Espera --delay segundos entre peticiones.
 * - Se detiene si encuentra --stop-after horas vacías seguidas (fin del historial disponible).
 * - Ctrl+C termina la hora en curso y sale ordenadamente.
 */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ejecuta ingestHour reintentando si falla la BASE DE DATOS (no la SEC: esos fallos
 * ya los registra ingestHour). Ej.: ECONNRESET si Docker reinicia la conexión.
 * Devuelve null si la BD sigue sin responder después de los reintentos.
 */
async function ingestWithDbRetry(hour: LocalHour, maxAttempts = 5) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await ingestHour(pool, fetchSecHour, hour, { isFinal: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  [db] error en ${formatLocalHour(hour)}: ${msg} (intento ${attempt}/${maxAttempts})`);
      if (attempt < maxAttempts) await sleep(attempt * 15_000); // 15 s, 30 s, 45 s...
    }
  }
  return null;
}

async function main() {
  const { values } = parseArgs({
    options: {
      from: { type: 'string' }, // AAAA-MM-DD (hora de Chile), inclusive
      to: { type: 'string' }, // AAAA-MM-DD (hora de Chile), inclusive; por defecto: hace 3 horas
      delay: { type: 'string', default: '10' }, // segundos entre peticiones
      'stop-after': { type: 'string', default: '48' }, // horas vacías seguidas antes de detenerse
    },
  });
  if (!values.from) {
    console.error('Uso: npm run backfill -- --from 2024-01-01 [--to 2026-10-03] [--delay 10]');
    process.exit(1);
  }

  const [fy, fm, fd] = values.from.split('-').map(Number);
  const fromUtc = localHourToUtc({ anho: fy, mes: fm, dia: fd, hora: 0 });
  let toUtc: Date;
  if (values.to) {
    const [ty, tm, td] = values.to.split('-').map(Number);
    toUtc = localHourToUtc({ anho: ty, mes: tm, dia: td, hora: 23 });
  } else {
    toUtc = new Date(Date.now() - 3 * 3600_000); // las horas recientes las cubre el ciclo normal
  }
  const delayMs = Number(values.delay) * 1000;
  const stopAfter = Number(values['stop-after']);

  // Horas ya definitivas en el rango → se saltan.
  const done = await pool.query<{ period_start: Date }>(
    `SELECT period_start FROM fetched_hours WHERE source = 'sec' AND is_final AND period_start BETWEEN $1 AND $2`,
    [fromUtc, toUtc],
  );
  const doneKeys = new Set(done.rows.map((r) => hourKey(toLocalHour(r.period_start))));
  const pending = listHoursBackward(fromUtc, toUtc).filter((h) => !doneKeys.has(hourKey(h)));

  const etaH = ((pending.length * (delayMs + 500)) / 3600_000).toFixed(1);
  console.log(`Backfill SEC: ${pending.length} horas pendientes (${doneKeys.size} ya listas). ETA ≈ ${etaH} h.`);
  console.log('Ctrl+C para pausar; al volver a ejecutar, retoma donde quedó.\n');

  let stopping = false;
  process.on('SIGINT', () => {
    if (stopping) process.exit(1);
    stopping = true;
    console.log('\nDeteniendo después de la hora en curso... (Ctrl+C otra vez para forzar)');
  });

  let ok = 0;
  let failed = 0;
  let consecutiveEmpty = 0;
  let consecutiveErrors = 0;

  for (const [i, hour] of pending.entries()) {
    if (stopping) break;
    const s = await ingestWithDbRetry(hour);
    if (!s) {
      console.error('\nLa base de datos no responde tras varios intentos. Revisa Docker y vuelve a ejecutar.');
      break;
    }
    const pct = (((i + 1) / pending.length) * 100).toFixed(1);
    console.log(
      `[${i + 1}/${pending.length} · ${pct}%] ${formatLocalHour(hour)} → ${s.status}` +
        (s.status === 'failed' ? ` (${s.error})` : ` | ${s.comunasAfectadas} comunas | ${s.clientesTotal} clientes`),
    );

    if (s.status === 'failed') {
      failed++;
      if (s.error === 'empty_response') {
        consecutiveEmpty++;
        if (consecutiveEmpty >= stopAfter) {
          console.log(`\n${stopAfter} horas vacías seguidas: parece el inicio del historial disponible. Fin.`);
          break;
        }
      } else {
        consecutiveErrors++;
        if (consecutiveErrors >= 10) {
          console.error('\n10 errores seguidos: la SEC podría estar caída o bloqueando. Se detiene el backfill.');
          break;
        }
        if (consecutiveErrors >= 3) await sleep(60_000); // pausa extra ante errores repetidos
      }
    } else {
      ok++;
      consecutiveEmpty = 0;
      consecutiveErrors = 0;
    }
    if (i < pending.length - 1 && !stopping) await sleep(delayMs);
  }

  console.log(`\nResumen: ${ok} horas cargadas, ${failed} fallidas.`);
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await pool.end().catch(() => {});
  process.exit(1);
});
