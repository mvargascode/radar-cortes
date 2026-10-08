import { Inject, Injectable } from '@nestjs/common';
import type pg from 'pg';
import { getFreshness } from '../common/freshness.js';
import { config } from '../config.js';
import { PG_POOL } from '../db/db.module.js';

@Injectable()
export class StatusService {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  /**
   * Estado actual: clientes sin luz por comuna en la hora más reciente con datos,
   * más el incidente abierto de cada comuna (si lo hay). Alimenta el mapa coroplético.
   */
  async current(region: string) {
    const freshness = await getFreshness(this.pool);
    const { rows } = await this.pool.query(
      `SELECT c.cut, c.nombre,
              coalesce(h.clientes_afectados, 0) AS clientes,
              i.id AS incident_id, i.status AS incident_status,
              i.started_at AS incident_started_at, i.peak_clientes AS incident_peak
       FROM comunas c
       LEFT JOIN hourly_outages h
         ON h.cut = c.cut AND h.source = $1 AND h.period_start = $3
       LEFT JOIN incidents i
         ON i.cut = c.cut AND i.source = $1 AND i.status <> 'RESTORED'
       WHERE c.region_cut = $2
       ORDER BY clientes DESC, c.nombre`,
      [config.source, region, freshness.latestPeriod],
    );
    const comunas = rows.map((r) => ({
      cut: r.cut,
      nombre: r.nombre,
      clientes: r.clientes,
      incidente: r.incident_id
        ? {
            id: Number(r.incident_id),
            status: r.incident_status,
            startedAt: r.incident_started_at.toISOString(),
            peakClientes: r.incident_peak,
          }
        : null,
    }));
    return {
      source: config.source,
      region,
      ...freshness,
      totalClientes: comunas.reduce((s, c) => s + c.clientes, 0),
      comunasConCortes: comunas.filter((c) => c.clientes > 0).length,
      incidentesAbiertos: comunas.filter((c) => c.incidente).length,
      comunas,
    };
  }
}
