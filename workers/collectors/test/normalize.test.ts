import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { normalizeName, resolveRows } from '../src/normalize.js';
import { secResponseSchema } from '../src/sec/schema.js';

const fixture = secResponseSchema.parse(
  JSON.parse(readFileSync(new URL('./fixtures/sec-2024-08-02-12.json', import.meta.url), 'utf8')),
);

const comunas = [
  { cut: '13119', nombre: 'Maipú' },
  { cut: '13120', nombre: 'Ñuñoa' },
  { cut: '05502', nombre: 'Calera' },
  { cut: '13403', nombre: 'Calera de Tango' },
];

describe('normalizeName', () => {
  it('quita tildes, símbolos y mayúsculas', () => {
    expect(normalizeName('Maipú')).toBe('maipu');
    expect(normalizeName('Ñuñoa')).toBe('nunoa');
    expect(normalizeName("O`Higgins")).toBe(normalizeName("O'Higgins"));
  });
});

describe('resolveRows', () => {
  it('usa alias exactos y resuelve por normalización', () => {
    const rows = [
      { NOMBRE_REGION: 'Valparaiso', NOMBRE_COMUNA: 'La Calera', CLIENTES_AFECTADOS: 10 },
      { NOMBRE_REGION: 'Metropolitana', NOMBRE_COMUNA: 'Maipu', CLIENTES_AFECTADOS: 5 },
    ];
    const aliases = [{ raw_region: 'Valparaiso', raw_comuna: 'La Calera', cut: '05502' }];
    const { byCut, anomalies } = resolveRows(rows, aliases, comunas);
    expect(byCut.get('05502')).toBe(10);
    expect(byCut.get('13119')).toBe(5);
    expect(anomalies).toEqual([{ kind: 'resolved_by_normalization', row: rows[1], cut: '13119' }]);
  });

  it('registra nombres vacíos y desconocidos como anomalías sin fallar', () => {
    const rows = [
      { NOMBRE_REGION: '', NOMBRE_COMUNA: '', CLIENTES_AFECTADOS: 1 },
      { NOMBRE_REGION: 'X', NOMBRE_COMUNA: 'Comuna Inventada', CLIENTES_AFECTADOS: 3 },
      { NOMBRE_REGION: 'Metropolitana', NOMBRE_COMUNA: 'Maipu', CLIENTES_AFECTADOS: 0 },
    ];
    const { byCut, anomalies } = resolveRows(rows, [], comunas);
    expect(byCut.size).toBe(0);
    expect(anomalies.map((a) => a.kind)).toEqual(['empty_name', 'unresolved']);
  });

  it('la muestra real del temporal 2024 cumple el esquema y trae la fila vacía conocida', () => {
    expect(fixture.length).toBe(299);
    expect(fixture.filter((r) => !r.NOMBRE_COMUNA)).toHaveLength(1);
  });
});

describe('statusFor (D-012)', async () => {
  const { statusFor } = await import('../src/ingest.js');
  const row = { NOMBRE_REGION: '', NOMBRE_COMUNA: '', CLIENTES_AFECTADOS: 1 };
  it('las filas sin nombre no marcan la hora como parcial', () => {
    expect(statusFor([{ kind: 'empty_name', row }])).toBe('success');
  });
  it('un nombre sin traducir sí la marca como parcial', () => {
    expect(statusFor([{ kind: 'unresolved', row }])).toBe('partial');
  });
});
