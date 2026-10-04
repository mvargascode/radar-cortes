import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
// .env propio del collector (opcional) y luego el de la raíz del repo.
loadEnv({ path: path.resolve(here, '../.env'), quiet: true });
loadEnv({ path: path.resolve(here, '../../../.env'), quiet: true });

function databaseUrl(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const { POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB } = process.env;
  const port = process.env.DB_PORT ?? '5433';
  if (!POSTGRES_USER || !POSTGRES_PASSWORD || !POSTGRES_DB) {
    throw new Error('Falta DATABASE_URL o POSTGRES_USER/POSTGRES_PASSWORD/POSTGRES_DB en .env');
  }
  return `postgres://${POSTGRES_USER}:${encodeURIComponent(POSTGRES_PASSWORD)}@localhost:${port}/${POSTGRES_DB}`;
}

export const config = {
  databaseUrl: databaseUrl(),
  sec: {
    url: 'https://apps.sec.cl/INTONLINEv1/ClientesAfectados/GetPorFecha',
    referer: 'https://apps.sec.cl/INTONLINEv1/index.aspx',
    userAgent:
      process.env.SEC_USER_AGENT ?? 'RadarDeCortes/0.1 (+https://github.com/mvargascode/radar-cortes)',
    timeoutMs: Number(process.env.SEC_TIMEOUT_MS ?? 15000),
    maxRetries: Number(process.env.SEC_MAX_RETRIES ?? 3),
  },
  watchIntervalMin: Number(process.env.WATCH_INTERVAL_MIN ?? 15),
};
