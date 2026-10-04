import { config } from '../config.js';
import type { LocalHour } from '../time.js';
import { secResponseSchema, type SecRow } from './schema.js';

export interface SecFetchResult {
  httpStatus: number;
  raw: unknown;
  rows: SecRow[];
}

export type SecFetcher = (hour: LocalHour) => Promise<SecFetchResult>;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Consulta GetPorFecha para una hora local, con timeout, reintentos y validación de esquema. */
export const fetchSecHour: SecFetcher = async (hour) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= config.sec.maxRetries; attempt++) {
    try {
      const res = await fetch(config.sec.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=UTF-8',
          Accept: 'application/json',
          Referer: config.sec.referer,
          'User-Agent': config.sec.userAgent,
        },
        body: JSON.stringify(hour),
        signal: AbortSignal.timeout(config.sec.timeoutMs),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw: unknown = await res.json();
      const rows = secResponseSchema.parse(raw); // falla si la SEC cambia el formato
      return { httpStatus: res.status, raw, rows };
    } catch (err) {
      lastError = err;
      if (attempt < config.sec.maxRetries) await sleep(2 ** attempt * 1000); // 2 s, 4 s...
    }
  }
  throw lastError;
};
