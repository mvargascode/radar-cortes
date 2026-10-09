import { fechaHora, hora, num } from '../format';

interface Props {
  points: { t: string; clientes: number | null }[];
  threshold?: number;
}

/**
 * Clientes sin luz hora a hora. Las horas sin datos cortan la línea (no se dibujan como cero).
 */
export function Timeline({ points, threshold = 500 }: Props) {
  const W = 320;
  const H = 120;
  const pad = { t: 10, r: 8, b: 22, l: 8 };
  if (points.length < 2) return null;
  const max = Math.max(threshold, ...points.map((p) => p.clientes ?? 0));
  const x = (i: number) => pad.l + (i / (points.length - 1)) * (W - pad.l - pad.r);
  const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);

  // Segmentos continuos separados por horas sin datos.
  const segments: { i: number; v: number }[][] = [];
  let cur: { i: number; v: number }[] = [];
  points.forEach((p, i) => {
    if (p.clientes === null) {
      if (cur.length) segments.push(cur);
      cur = [];
    } else cur.push({ i, v: p.clientes });
  });
  if (cur.length) segments.push(cur);

  const line = (s: { i: number; v: number }[]) => s.map((p, k) => `${k ? 'L' : 'M'}${x(p.i)},${y(p.v)}`).join('');
  const area = (s: { i: number; v: number }[]) =>
    `${line(s)}L${x(s[s.length - 1].i)},${y(0)}L${x(s[0].i)},${y(0)}Z`;
  const peak = points.reduce((a, p, i) => ((p.clientes ?? -1) > (points[a].clientes ?? -1) ? i : a), 0);

  return (
    <figure className="timeline">
      <svg viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label={`Clientes sin luz entre ${fechaHora(points[0].t)} y ${fechaHora(points[points.length - 1].t)}. Máximo: ${num(points[peak].clientes ?? 0)}.`}>
        <line className="timeline-threshold" x1={pad.l} x2={W - pad.r} y1={y(threshold)} y2={y(threshold)} />
        {segments.map((s, k) => (
          <g key={k}>
            <path className="timeline-area" d={area(s)} />
            <path className="timeline-line" d={line(s)} />
          </g>
        ))}
        <circle className="timeline-peak" cx={x(peak)} cy={y(points[peak].clientes ?? 0)} r={3.5} />
        <text className="timeline-axis" x={pad.l} y={H - 6}>{hora(points[0].t)}</text>
        <text className="timeline-axis" x={W - pad.r} y={H - 6} textAnchor="end">{hora(points[points.length - 1].t)}</text>
      </svg>
      <figcaption>La línea punteada marca 500 clientes, el umbral desde el que contamos un corte.</figcaption>
    </figure>
  );
}
