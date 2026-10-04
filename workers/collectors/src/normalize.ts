import type { SecRow } from './sec/schema.js';

/** Normaliza un nombre para compararlo: sin tildes, minúsculas, solo letras y números. */
export function normalizeName(s: string): string {
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export interface ComunaRef {
  cut: string;
  nombre: string;
}

export interface AliasRef {
  raw_region: string;
  raw_comuna: string;
  cut: string;
}

export type Anomaly =
  | { kind: 'empty_name'; row: SecRow }
  | { kind: 'unresolved'; row: SecRow }
  | { kind: 'resolved_by_normalization'; row: SecRow; cut: string };

export interface ResolveResult {
  /** Clientes afectados por código CUT (sumados si dos nombres caen en la misma comuna). */
  byCut: Map<string, number>;
  anomalies: Anomaly[];
}

/**
 * Traduce las filas de la SEC a códigos CUT.
 * Orden: alias exacto → nombre normalizado con coincidencia única → anomalía.
 */
export function resolveRows(rows: SecRow[], aliases: AliasRef[], comunas: ComunaRef[]): ResolveResult {
  const aliasMap = new Map(aliases.map((a) => [`${a.raw_region}|${a.raw_comuna}`, a.cut]));
  const byNorm = new Map<string, string[]>();
  for (const c of comunas) {
    const k = normalizeName(c.nombre);
    byNorm.set(k, [...(byNorm.get(k) ?? []), c.cut]);
  }

  const byCut = new Map<string, number>();
  const anomalies: Anomaly[] = [];

  for (const row of rows) {
    if (row.CLIENTES_AFECTADOS === 0) continue;
    if (!row.NOMBRE_COMUNA.trim()) {
      anomalies.push({ kind: 'empty_name', row });
      continue;
    }
    let cut = aliasMap.get(`${row.NOMBRE_REGION}|${row.NOMBRE_COMUNA}`);
    if (!cut) {
      const matches = byNorm.get(normalizeName(row.NOMBRE_COMUNA)) ?? [];
      if (matches.length === 1) {
        cut = matches[0];
        anomalies.push({ kind: 'resolved_by_normalization', row, cut });
      } else {
        anomalies.push({ kind: 'unresolved', row });
        continue;
      }
    }
    byCut.set(cut, (byCut.get(cut) ?? 0) + row.CLIENTES_AFECTADOS);
  }
  return { byCut, anomalies };
}
