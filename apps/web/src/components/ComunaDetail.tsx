import { useEffect, useState } from 'react';
import { api, type ComunaStats, type ComunaStatus, type IncidentDetail } from '../api';
import { duracion, fecha, hora, horasDesde, num } from '../format';
import { HourBars } from './HourBars';
import { Timeline } from './Timeline';

interface Props {
  comuna: ComunaStatus;
  /** Cambia cada vez que llegan datos nuevos: fuerza a recargar el detalle. */
  refreshKey: string | null;
  onClose: () => void;
}

export function ComunaDetail({ comuna, refreshKey, onClose }: Props) {
  const [stats, setStats] = useState<ComunaStats | null>(null);
  const [incident, setIncident] = useState<IncidentDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const incidentId = comuna.incidente?.id ?? null;

  useEffect(() => {
    const ac = new AbortController();
    setError(null);
    api.comunaStats(comuna.cut, ac.signal).then(setStats, (e) => !ac.signal.aborted && setError(e.message));
    return () => ac.abort();
  }, [comuna.cut, refreshKey]);

  useEffect(() => {
    const ac = new AbortController();
    setIncident(null);
    if (incidentId) api.incident(incidentId, ac.signal).then(setIncident, () => {});
    return () => ac.abort();
  }, [incidentId, refreshKey]);

  const peor = stats?.peores[0];

  return (
    <section className="detail" aria-labelledby="detail-title">
      <button type="button" className="back" onClick={onClose}>Volver al resumen</button>
      <h2 id="detail-title" className="detail-title">{comuna.nombre}</h2>

      <p className="detail-now">
        <span className="big-number">{num(comuna.clientes)}</span>
        <span>clientes sin luz en este momento</span>
      </p>

      {comuna.incidente ? (
        <div className="incident">
          <p className="incident-lead">
            Corte en curso desde las {hora(comuna.incidente.startedAt)}
            {' '}({duracion(horasDesde(comuna.incidente.startedAt))}). Llegó a {num(comuna.incidente.peakClientes)} clientes.
          </p>
          {incident && <Timeline points={incident.timeline} />}
        </div>
      ) : (
        <p className="muted">No hay un corte en curso. Bajo 500 clientes lo tratamos como cortes aislados.</p>
      )}

      <h3 className="detail-sub">El último año en {comuna.nombre}</h3>
      {error && <p className="error">No se pudieron cargar las estadísticas: {error}</p>}
      {!stats && !error && <p className="muted">Cargando estadísticas…</p>}
      {stats && (
        <>
          <dl className="facts">
            <div><dt>Cortes</dt><dd>{num(stats.incidentes)}</dd></div>
            <div><dt>Duración típica</dt><dd>{stats.duracionMedianaHoras === null ? 'Sin datos' : duracion(Math.round(stats.duracionMedianaHoras))}</dd></div>
            <div><dt>Mayor cantidad de clientes</dt><dd>{stats.peakMax === null ? 'Sin datos' : num(stats.peakMax)}</dd></div>
          </dl>

          {peor && (
            <p className="worst">
              El corte de mayor impacto empezó el {fecha(peor.startedAt)} a las {hora(peor.startedAt)},
              duró {duracion(peor.duracionHoras)} y llegó a {num(peor.peakClientes)} clientes.
            </p>
          )}

          {stats.incidentes > 0 && (
            <>
              <h4 className="detail-sub-small">A qué hora suelen empezar</h4>
              <HourBars data={stats.porHoraDelDia} />
            </>
          )}
        </>
      )}
    </section>
  );
}
