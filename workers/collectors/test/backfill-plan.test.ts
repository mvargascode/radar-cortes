import { describe, expect, it } from 'vitest';
import { hourKey, listHoursBackward } from '../src/backfill-plan.js';
import { localHourToUtc } from '../src/time.js';

describe('listHoursBackward', () => {
  it('recorre de la hora más reciente a la más antigua', () => {
    const from = localHourToUtc({ anho: 2026, mes: 10, dia: 3, hora: 0 });
    const to = localHourToUtc({ anho: 2026, mes: 10, dia: 3, hora: 23 });
    const hours = listHoursBackward(from, to);
    expect(hours).toHaveLength(24);
    expect(hours[0]).toEqual({ anho: 2026, mes: 10, dia: 3, hora: 23 });
    expect(hours[23]).toEqual({ anho: 2026, mes: 10, dia: 3, hora: 0 });
  });

  it('no repite horas en el cambio de horario de otoño (abril 2025)', () => {
    const from = localHourToUtc({ anho: 2025, mes: 4, dia: 5, hora: 0 });
    const to = localHourToUtc({ anho: 2025, mes: 4, dia: 6, hora: 23 });
    const hours = listHoursBackward(from, to);
    const keys = hours.map(hourKey);
    expect(new Set(keys).size).toBe(keys.length);
    expect(hours).toHaveLength(48);
  });
});
