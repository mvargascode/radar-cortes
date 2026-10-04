import { toLocalHour, type LocalHour } from './time.js';

const key = (h: LocalHour) => `${h.anho}-${h.mes}-${h.dia}-${h.hora}`;

/**
 * Lista las horas locales de Chile entre dos fechas (inclusive), de la más reciente a la más antigua.
 * Recorre instantes UTC hora a hora, así que respeta los cambios de horario:
 * la hora repetida de otoño aparece una sola vez y la hora inexistente de primavera no aparece.
 */
export function listHoursBackward(fromUtc: Date, toUtc: Date): LocalHour[] {
  const out: LocalHour[] = [];
  const seen = new Set<string>();
  const start = Math.floor(toUtc.getTime() / 3600_000) * 3600_000;
  for (let t = start; t >= fromUtc.getTime(); t -= 3600_000) {
    const h = toLocalHour(new Date(t));
    const k = key(h);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(h);
    }
  }
  return out;
}

export { key as hourKey };
