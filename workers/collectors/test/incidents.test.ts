import { describe, expect, it } from 'vitest';
import { deriveIncidents, type HourPoint } from '../src/incidents.js';

const T0 = Date.UTC(2024, 7, 2, 10); // 2024-08-02 10:00 UTC
const H = 3600_000;

/** Serie de horas consecutivas; null = hora sin datos (no se incluye). */
function series(values: (number | null)[]): HourPoint[] {
  return values.flatMap((v, i) => (v === null ? [] : [{ t: new Date(T0 + i * H), value: v }]));
}
const at = (i: number) => new Date(T0 + i * H);

describe('deriveIncidents', () => {
  it('ignora el ruido de fondo bajo el umbral', () => {
    expect(deriveIncidents(series([5, 20, 80, 499, 12, 0]))).toEqual([]);
  });

  it('un corte simple: inicio, fin, peak y cliente-horas', () => {
    const [inc] = deriveIncidents(series([10, 600, 2000, 900, 50, 20, 10]));
    expect(inc).toMatchObject({
      status: 'RESTORED',
      startedAt: at(1),
      endedAt: at(4), // la última hora sobre el umbral (3) + 1
      peakClientes: 2000,
      peakAt: at(2),
      clienteHoras: 3500,
      hoursAbove: 3,
    });
  });

  it('una sola hora bajo el umbral no parte el incidente', () => {
    const incs = deriveIncidents(series([800, 300, 900, 0, 0]));
    expect(incs).toHaveLength(1);
    expect(incs[0].clienteHoras).toBe(800 + 300 + 900);
    expect(incs[0].endedAt).toEqual(at(3));
  });

  it('dos horas bajo el umbral cierran y luego se abre otro', () => {
    const incs = deriveIncidents(series([800, 100, 100, 700, 0, 0]));
    expect(incs).toHaveLength(2);
    expect(incs[1].startedAt).toEqual(at(3));
  });

  it('un hueco corto de datos no cierra el incidente (D-013)', () => {
    const incs = deriveIncidents(series([800, null, null, 900, 0, 0]));
    expect(incs).toHaveLength(1);
    expect(incs[0].endedAt).toEqual(at(4));
  });

  it('un hueco largo cierra en la última hora conocida', () => {
    const incs = deriveIncidents(series([800, ...Array(7).fill(null), 900, 0, 0]));
    expect(incs).toHaveLength(2);
    expect(incs[0].endedAt).toEqual(at(1));
  });

  it('un incidente abierto al final queda DETECTED o ACTIVE', () => {
    expect(deriveIncidents(series([0, 0, 700]))[0]).toMatchObject({ status: 'DETECTED', endedAt: null });
    expect(deriveIncidents(series([0, 700, 900, 100]))[0]).toMatchObject({ status: 'ACTIVE', endedAt: null });
  });

  it('respeta un umbral personalizado', () => {
    const rules = { openThreshold: 100, closeAfterHours: 2, maxGapHours: 6 };
    expect(deriveIncidents(series([150, 0, 0]), rules)).toHaveLength(1);
  });
});
