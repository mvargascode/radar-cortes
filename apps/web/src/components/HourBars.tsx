interface Props {
  data: { hora: number; incidentes: number }[];
}

/** En qué hora del día suelen comenzar los cortes de una comuna. */
export function HourBars({ data }: Props) {
  const byHour = Array.from({ length: 24 }, (_, h) => data.find((d) => d.hora === h)?.incidentes ?? 0);
  const max = Math.max(1, ...byHour);
  const top = byHour.indexOf(max);
  return (
    <figure className="hours">
      <div className="hours-bars" role="img"
        aria-label={`Los cortes suelen comenzar alrededor de las ${top}:00 (${max} en el último año).`}>
        {byHour.map((v, h) => (
          <span key={h} className={h === top ? 'is-top' : undefined} style={{ height: `${Math.max(4, (v / max) * 100)}%` }}
            title={`${h}:00, ${v} cortes`} />
        ))}
      </div>
      <div className="hours-axis" aria-hidden="true">
        <span>0 h</span><span>6 h</span><span>12 h</span><span>18 h</span><span>23 h</span>
      </div>
    </figure>
  );
}
