import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type pg from 'pg';
import { toIncidentSummary } from '../comunas/comunas.service.js';
import { config } from '../config.js';
import { PG_POOL } from '../db/db.module.js';

export interface IncidentFilters {
  status: 'open' | 'restored' | 'all';
  region: string;
  cut?: string;
  from?: Date;
  to?: Date;
  sort: 'recent' | 'impact';
  limit: number;
  offset: number;
}

const SELECT = `
  SELECT i.id, i.status, i.source_type, i.started_at, i.ended_at, i.peak_clientes, i.peak_at,
         i.cliente_horas, c.cut, c.nombre
  FROM incidents i JOIN comunas c USING (cut)`;

@Injectable()
export class IncidentsService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async list(f: IncidentFilters) {
    const where = ['i.source = $1', 'c.region_cut = $2'];
    const params: unknown[] = [config.source, f.region];
    const add = (sql: string, value: unknown) => {
      params.push(value);
      where.push(sql.replace('?', `$${params.length}`));
    };
    if (f.status === 'open') where.push(`i.status <> 'RESTORED'`);
    if (f.status === 'restored') where.push(`i.status = 'RESTORED'`);
    if (f.cut) add('i.cut = ?', f.cut);
    if (f.from) add('coalesce(i.ended_at, now()) >= ?', f.from);
    if (f.to) add('i.started_at < ?', f.to);
    const order = f.sort === 'impact' ? 'i.cliente_horas DESC' : 'i.started_at DESC';

    const total = await this.pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM incidents i JOIN comunas c USING (cut) WHERE ${where.join(' AND ')}`,
      params,
    );
    const { rows } = await this.pool.query(
      `${SELECT} WHERE ${where.join(' AND ')} ORDER BY ${order}, i.id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, f.limit, f.offset],
    );
    return { total: total.rows[0].n, limit: f.limit, offset: f.offset, items: rows.map(toItem) };
  }

  /** Detalle de un incidente con su línea de tiempo hora a hora (3 horas antes y después). */
  async detail(id: number) {
    const { rows } = await this.pool.query(`${SELECT} WHERE i.id = $1 AND i.source = $2`, [id, config.source]);
    if (rows.length === 0) throw new NotFoundException(`Incidente ${id} no existe`);
    const inc = rows[0];

    // null = hora sin datos (no se interpreta como cero, D-013).
    const timeline = await this.pool.query<{ t: Date; clientes: number | null }>(
      `SELECT g AS t,
              CASE WHEN f.period_start IS NULL THEN NULL ELSE coalesce(h.clientes_afectados, 0) END AS clientes
       FROM generate_series($1::timestamptz - interval '3 hours',
                            coalesce($2::timestamptz, date_trunc('hour', now())) + interval '2 hours',
                            interval '1 hour') g
       LEFT JOIN fetched_hours f ON f.source = $3 AND f.period_start = g
       LEFT JOIN hourly_outages h ON h.source = $3 AND h.cut = $4 AND h.period_start = g
       WHERE g <= now()
       ORDER BY g`,
      [inc.started_at, inc.ended_at, config.source, inc.cut],
    );
    return {
      ...toItem(inc),
      timeline: timeline.rows.map((r) => ({ t: r.t.toISOString(), clientes: r.clientes })),
    };
  }
}

function toItem(r: Record<string, any>) {
  return {
    ...toIncidentSummary(r as any),
    sourceType: r.source_type,
    peakAt: r.peak_at.toISOString(),
    comuna: { cut: r.cut, nombre: r.nombre },
  };
}
