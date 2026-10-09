import type { ExpressionSpecification } from 'maplibre-gl';

/**
 * Escala "ciudad de noche": las comunas con luz brillan en ámbar y se apagan
 * a medida que suben los clientes sin luz. Los cortes en curso (>= 500, D-014)
 * caen en los tres últimos tramos.
 */
export const STEPS = [
  { min: 0, color: '#F4B942', label: 'Menos de 100' },
  { min: 100, color: '#C38E3B', label: '100 a 499' },
  { min: 500, color: '#83663F', label: '500 a 1.999' },
  { min: 2000, color: '#4B4C55', label: '2.000 a 9.999' },
  { min: 10000, color: '#252C3B', label: '10.000 o más' },
] as const;

export function colorFor(clientes: number): string {
  let c: string = STEPS[0].color;
  for (const s of STEPS) if (clientes >= s.min) c = s.color;
  return c;
}

/** Expresión de MapLibre equivalente a colorFor, sobre el feature-state "clientes". */
export const fillColorExpression = [
  'step',
  ['coalesce', ['feature-state', 'clientes'], 0],
  STEPS[0].color,
  ...STEPS.slice(1).flatMap((s) => [s.min, s.color]),
] as unknown as ExpressionSpecification;
