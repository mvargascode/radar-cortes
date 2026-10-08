import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type pg from 'pg';
import { config } from '../config.js';
import { PG_POOL } from '../db/db.module.js';

@Injectable()
export class ComunasService {
  /** Las geometrías no cambian: se cachean en memoria por región. */
  private readonly geoCache = new Map<string, unknown>();

  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  /**
   * Polígonos de las comunas de una región como GeoJSON (FeatureCollection).
   * Se simplifican (~50 m) y se recortan a 5 decimales para que el mapa cargue rápido.
   */
  async geojson(region: string): Promise<unknown> {
    const cached = this.geoCache.get(region);
    if (cached) return cached;
    const { rows } = await this.pool.query<{ fc: unknown }>(
      `SELECT json_build_object(
         'type', 'FeatureCollection',
         'features', coalesce(json_agg(json_build_object(
           'type', 'Feature',
           'id', cut,
           'properties', json_build_object('cut', cut, 'nombre', nombre, 'region', region_nombre),
           'geometry', ST_AsGeoJSON(ST_SimplifyPreserveTopology(geom, 0.0005), 5)::json
         ) ORDER BY cut), '[]'::json)
       ) AS fc
       FROM comunas WHERE region_cut = $1 AND geom IS NOT NULL`,
      [region],
    );
    this.geoCache.set(region, rows[0].fc);
    return rows[0].fc;
  }

  /** Estadísticas de una comuna en los últimos `days` días. */
  async stats(cut: string, days: number) {
    const comuna = await this.pool.query<{ cut: string; nombre: string; region_nombre: string }>(
      `SELECT cut, nombre, region_nombre FROM comunas WHERE cut = $1`,
      [cut],
    );
    if (comuna.rowCount === 0) throw new NotFoundException(`Comuna ${cut} no existe`);

    const summary = await this.pool.query(
      `SELECT count(*)::int AS incidentes,
              coalesce(sum(cliente_horas), 0)::bigint AS cliente_horas,
              max(peak_clientes) AS peak_max,
              percentile_cont(0.5) WITHIN GROUP (
                ORDER BY extract(epoch FROM ended_at - started_at) / 3600
              ) FILTER (WHERE ended_at IS NOT NULL) AS duracion_mediana_h
       FROM incidents
       WHERE source = $1 AND cut = $2 AND started_at >= now() - make_interval(days => $3)`,
      [config.source, cut, days],
    );

    const worst = await this.pool.query(
      `SELECT id, status, started_at, ended_at, peak_clientes, cliente_horas
       FROM incidents
       WHERE source = $1 AND cut = $2 AND started_at >= now() - make_interval(days => $3)
       ORDER BY cliente_horas DESC LIMIT 5`,
      [config.source, cut, days],
    );

    const monthly = await this.pool.query(
      `SELECT to_char(date_trunc('month', started_at AT TIME ZONE 'America/Santiago'), 'YYYY-MM') AS mes,
              count(*)::int AS incidentes,
              sum(cliente_horas)::bigint AS cliente_horas
       FROM incidents
       WHERE source = $1 AND cut = $2 AND started_at >= now() - make_interval(days => $3)
       GROUP BY 1 ORDER BY 1`,
      [config.source, cut, days],
    );

    // Hora del día (Chile) en que suelen comenzar los cortes.
    const byHour = await this.pool.query(
      `SELECT extract(hour FROM started_at AT TIME ZONE 'America/Santiago')::int AS hora, count(*)::int AS incidentes
       FROM incidents
       WHERE source = $1 AND cut = $2 AND started_at >= now() - make_interval(days => $3)
       GROUP BY 1 ORDER BY 1`,
      [config.source, cut, days],
    );

    const s = summary.rows[0];
    return {
      comuna: comuna.rows[0],
      days,
      incidentes: s.incidentes,
      clienteHoras: Number(s.cliente_horas),
      peakMax: s.peak_max,
      duracionMedianaHoras: s.duracion_mediana_h === null ? null : Number(Number(s.duracion_mediana_h).toFixed(1)),
      peores: worst.rows.map(toIncidentSummary),
      porMes: monthly.rows.map((r) => ({ mes: r.mes, incidentes: r.incidentes, clienteHoras: Number(r.cliente_horas) })),
      porHoraDelDia: byHour.rows,
    };
  }
}

export function toIncidentSummary(r: {
  id: string;
  status: string;
  started_at: Date;
  ended_at: Date | null;
  peak_clientes: number;
  cliente_horas: string | number;
}) {
  const end = r.ended_at ?? new Date();
  return {
    id: Number(r.id),
    status: r.status,
    startedAt: r.started_at.toISOString(),
    endedAt: r.ended_at?.toISOString() ?? null,
    duracionHoras: Math.round((end.getTime() - r.started_at.getTime()) / 3600_000),
    peakClientes: r.peak_clientes,
    clienteHoras: Number(r.cliente_horas),
  };
}
