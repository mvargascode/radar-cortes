import pg from 'pg';
import { config } from './config.js';

export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  max: 5,
  // Mantiene viva la conexión TCP: evita que Docker/Windows corte conexiones inactivas.
  keepAlive: true,
  // Cierra conexiones inactivas antes de que alguien más las corte.
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Sin este listener, un error en una conexión inactiva tumba todo el proceso.
pool.on('error', (err) => {
  console.error(`[db] conexión inactiva cerrada: ${err.message}`);
});
