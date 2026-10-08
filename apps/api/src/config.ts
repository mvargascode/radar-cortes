import { config as loadEnv } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
// .env propio de la API (opcional) y luego el de la raíz del repo.
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
  port: Number(process.env.API_PORT ?? 3000),
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(',').map((s) => s.trim()),
  /** Fuente de datos de la v0.1. */
  source: 'sec',
  /** Región por defecto (Metropolitana). */
  defaultRegion: '13',
  /** Si la última ingesta exitosa es más antigua que esto, los datos se marcan como desactualizados. */
  staleAfterMinutes: 35,
  /** Canal LISTEN/NOTIFY que usa el collector para avisar datos nuevos. */
  updatesChannel: 'radar_updates',
};
