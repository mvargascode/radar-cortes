export const TZ = 'America/Santiago';

/** Hora local de Chile, tal como la recibe la SEC en el payload. */
export interface LocalHour {
  anho: number;
  mes: number; // 1-12
  dia: number;
  hora: number; // 0-23
}

const fmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
});

/** Convierte un instante UTC a la hora local de Chile (truncada a la hora). */
export function toLocalHour(date: Date): LocalHour {
  const p = Object.fromEntries(fmt.formatToParts(date).map((x) => [x.type, x.value]));
  return { anho: Number(p.year), mes: Number(p.month), dia: Number(p.day), hora: Number(p.hour) };
}

/**
 * Convierte una hora local de Chile al instante UTC en que comienza.
 * En el cambio de horario de otoño (hora repetida) devuelve la primera ocurrencia;
 * en el de primavera (hora inexistente) devuelve la hora siguiente válida.
 */
export function localHourToUtc(h: LocalHour): Date {
  const target = Date.UTC(h.anho, h.mes - 1, h.dia, h.hora);
  // Chile continental está entre UTC-4 y UTC-3; se prueba un rango amplio.
  const candidates = [2, 3, 4, 5]
    .map((off) => new Date(target + off * 3600_000))
    .filter((d) => {
      const l = toLocalHour(d);
      return Date.UTC(l.anho, l.mes - 1, l.dia, l.hora) === target;
    })
    .sort((a, b) => a.getTime() - b.getTime());
  if (candidates.length > 0) return candidates[0];
  // Hora inexistente (salto de primavera): la siguiente hora válida.
  return localHourToUtc({ ...h, hora: h.hora + 1 });
}

export function formatLocalHour(h: LocalHour): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h.anho}-${pad(h.mes)}-${pad(h.dia)} ${pad(h.hora)}:00`;
}
