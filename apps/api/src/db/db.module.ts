import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import pg from 'pg';
import { config } from '../config.js';

export const PG_POOL = Symbol('PG_POOL');

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      useFactory: () => {
        const pool = new pg.Pool({
          connectionString: config.databaseUrl,
          max: 10,
          keepAlive: true,
          idleTimeoutMillis: 30_000,
          connectionTimeoutMillis: 10_000,
        });
        pool.on('error', (err) => console.error(`[db] conexión inactiva cerrada: ${err.message}`));
        return pool;
      },
    },
  ],
  exports: [PG_POOL],
})
export class DbModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
