import type pg from 'pg';
import { config } from '../config.js';

export interface Freshness {
  /** Inicio de la hora más reciente con datos (UTC). */
  latestPeriod: string | null;
  /** Última ingesta exitosa del collector. */
  lastSuccessAt: string | null;
  /** true si el collector no ha tenido éxito recientemente. */
  stale: boolean;
}

export async function getFreshness(pool: pg.Pool): Promise<Freshness> {
  const { rows } = await pool.query<{ latest_period: Date | null; last_success_at: Date | null }>(
    `SELECT (SELECT max(period_start) FROM fetched_hours WHERE source = $1) AS latest_period,
            (SELECT max(finished_at) FROM ingestion_runs
              WHERE source = $1 AND kind = 'fetch' AND status IN ('success', 'partial')) AS last_success_at`,
    [config.source],
  );
  const { latest_period, last_success_at } = rows[0];
  const stale =
    !last_success_at || Date.now() - last_success_at.getTime() > config.staleAfterMinutes * 60_000;
  return {
    latestPeriod: latest_period?.toISOString() ?? null,
    lastSuccessAt: last_success_at?.toISOString() ?? null,
    stale,
  };
}
