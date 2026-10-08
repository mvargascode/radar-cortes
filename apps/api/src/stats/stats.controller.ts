import { Controller, Get, Inject, Query } from '@nestjs/common';
import type pg from 'pg';
import { z } from 'zod';
import { parse, regionSchema } from '../common/validation.js';
import { config } from '../config.js';
import { PG_POOL } from '../db/db.module.js';

@Controller('stats')
export class StatsController {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  /** Ranking de comunas de una región por impacto (cliente-horas) en los últimos `days` días. */
  @Get('comunas')
  async ranking(@Query() query: unknown) {
    const q = parse(
      z.object({
        region: regionSchema.default(config.defaultRegion),
        days: z.coerce.number().int().min(1).max(1100).default(365),
      }),
      query,
    );
    const { rows } = await this.pool.query(
      `SELECT c.cut, c.nombre,
              count(i.id)::int AS incidentes,
              coalesce(sum(i.cliente_horas), 0)::bigint AS cliente_horas,
              max(i.peak_clientes) AS peak_max,
              percentile_cont(0.5) WITHIN GROUP (
                ORDER BY extract(epoch FROM i.ended_at - i.started_at) / 3600
              ) FILTER (WHERE i.ended_at IS NOT NULL) AS duracion_mediana_h
       FROM comunas c
       LEFT JOIN incidents i
         ON i.cut = c.cut AND i.source = $1 AND i.started_at >= now() - make_interval(days => $3)
       WHERE c.region_cut = $2
       GROUP BY c.cut, c.nombre
       ORDER BY cliente_horas DESC, c.nombre`,
      [config.source, q.region, q.days],
    );
    return {
      region: q.region,
      days: q.days,
      comunas: rows.map((r) => ({
        cut: r.cut,
        nombre: r.nombre,
        incidentes: r.incidentes,
        clienteHoras: Number(r.cliente_horas),
        peakMax: r.peak_max,
        duracionMedianaHoras: r.duracion_mediana_h === null ? null : Number(Number(r.duracion_mediana_h).toFixed(1)),
      })),
    };
  }
}
