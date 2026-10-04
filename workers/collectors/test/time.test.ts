import { describe, expect, it } from 'vitest';
import { localHourToUtc, toLocalHour } from '../src/time.js';

describe('zona horaria America/Santiago', () => {
  it('invierno (UTC-4): 2024-08-02 12:00 local = 16:00 UTC', () => {
    expect(localHourToUtc({ anho: 2024, mes: 8, dia: 2, hora: 12 }).toISOString()).toBe('2024-08-02T16:00:00.000Z');
  });

  it('verano (UTC-3): 2026-09-30 00:00 local = 03:00 UTC', () => {
    expect(localHourToUtc({ anho: 2026, mes: 9, dia: 30, hora: 0 }).toISOString()).toBe('2026-09-30T03:00:00.000Z');
  });

  it('ida y vuelta conserva la hora', () => {
    const h = { anho: 2026, mes: 10, dia: 4, hora: 20 };
    expect(toLocalHour(localHourToUtc(h))).toEqual(h);
  });
});
