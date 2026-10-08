import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import type pg from 'pg';
import { getFreshness } from '../common/freshness.js';
import { PG_POOL } from '../db/db.module.js';

@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  /** Estado del servicio: base de datos y frescura de los datos. */
  @Get()
  async health() {
    try {
      await this.pool.query('SELECT 1');
    } catch {
      throw new ServiceUnavailableException({ status: 'error', database: 'down' });
    }
    const freshness = await getFreshness(this.pool);
    return { status: freshness.stale ? 'degraded' : 'ok', database: 'up', ...freshness };
  }
}
