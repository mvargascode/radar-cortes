import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type Status } from './api';
import { ComunaDetail } from './components/ComunaDetail';
import { MapView } from './components/MapView';
import { duracion, hora, horasDesde, num } from './format';
import { STEPS, colorFor } from './scale';

export function App() {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [status, setStatus] = useState<Status | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedCut, setSelectedCut] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [live, setLive] = useState(false);

  const loadStatus = useCallback(() => {
    api.status().then(
      (s) => { setStatus(s); setError(null); },
      (e: Error) => setError(e.message),
    );
  }, []);

  useEffect(() => {
    api.comunas().then(setGeojson, (e: Error) => setError(e.message));
    loadStatus();
  }, [loadStatus]);

  // Tiempo real: la API avisa por SSE cuando el collector guarda datos nuevos.
  useEffect(() => {
    const es = new EventSource('/api/stream');
    es.onopen = () => setLive(true);
    es.onerror = () => setLive(false);
    es.addEventListener('update', loadStatus);
    // Respaldo por si el SSE se corta: refresco cada 5 minutos.
    const fallback = setInterval(loadStatus, 5 * 60_000);
    return () => { es.close(); clearInterval(fallback); };
  }, [loadStatus]);

  const selected = status?.comunas.find((c) => c.cut === selectedCut) ?? null;
  const open = useMemo(() => status?.comunas.filter((c) => c.incidente) ?? [], [status]);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
    if (!q || !status) return [];
    return status.comunas
      .filter((c) => c.nombre.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').includes(q))
      .slice(0, 6);
  }, [query, status]);

  const select = (cut: string | null) => {
    setSelectedCut(cut);
    setQuery('');
    // En el celular el panel está bajo el mapa: llevarlo a la vista al elegir una comuna.
    if (cut && window.matchMedia('(max-width: 760px)').matches) {
      const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      document.querySelector('.panel')?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  };

  return (
    <div className="app">
      <aside className="panel">
        <header className="brand">
          <h1>Radar de Cortes</h1>
          <p className="freshness" aria-live="polite">
            <span className={`dot ${live && !status?.stale ? 'is-live' : ''}`} aria-hidden="true" />
            {status?.lastSuccessAt
              ? `Región Metropolitana. Datos de la SEC, actualizados a las ${hora(status.lastSuccessAt)}.`
              : 'Región Metropolitana. Cargando datos de la SEC…'}
          </p>
        </header>

        {status?.stale && (
          <p className="warning" role="status">
            No hemos recibido datos nuevos de la SEC en más de media hora. Lo que ves puede estar desactualizado.
          </p>
        )}
        {error && <p className="error" role="alert">No pudimos conectarnos con la API: {error}</p>}

        {selected ? (
          <ComunaDetail comuna={selected} refreshKey={status?.latestPeriod ?? null} onClose={() => select(null)} />
        ) : (
          <section className="summary" aria-label="Resumen">
            <p className="headline">
              <span className="big-number">{status ? num(status.totalClientes) : '—'}</span>
              <span>clientes sin luz en la Región Metropolitana</span>
            </p>

            <form className="search" role="search" onSubmit={(e) => { e.preventDefault(); if (matches[0]) select(matches[0].cut); }}>
              <label htmlFor="q">Busca tu comuna</label>
              <input id="q" type="search" autoComplete="off" placeholder="Ej.: Maipú" value={query}
                onChange={(e) => setQuery(e.target.value)} />
              {matches.length > 0 && (
                <ul className="matches">
                  {matches.map((c) => (
                    <li key={c.cut}>
                      <button type="button" onClick={() => select(c.cut)}>
                        <span>{c.nombre}</span><span className="num">{num(c.clientes)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </form>

            <div>
              <h2 className="list-title">
                {open.length === 0 ? 'Sin cortes en curso' : open.length === 1 ? '1 corte en curso' : `${open.length} cortes en curso`}
              </h2>
              {open.length === 0 ? (
                <p className="muted">Ninguna comuna supera los 500 clientes sin luz. Los cortes aislados igual se ven en el mapa.</p>
              ) : (
                <ul className="open-list">
                  {open.map((c) => (
                    <li key={c.cut}>
                      <button type="button" onClick={() => select(c.cut)}>
                        <span className="swatch" style={{ background: colorFor(c.clientes) }} aria-hidden="true" />
                        <span className="open-name">{c.nombre}</span>
                        <span className="open-since">hace {duracion(horasDesde(c.incidente!.startedAt))}</span>
                        <span className="num">{num(c.clientes)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        <footer className="legend" aria-label="Leyenda del mapa">
          <p className="legend-title">Clientes sin luz por comuna</p>
          <ol className="legend-scale">
            {STEPS.map((s) => (
              <li key={s.min}><span style={{ background: s.color }} aria-hidden="true" />{s.label}</li>
            ))}
          </ol>
          <p className="legend-note">Con luz, la comuna brilla. Mientras más clientes sin luz, más se apaga.</p>
        </footer>
      </aside>

      <main className="map-area">
        {geojson ? (
          <MapView geojson={geojson} status={status} selectedCut={selectedCut} onSelect={select} />
        ) : (
          <div className="map-placeholder">{error ? 'El mapa no está disponible.' : 'Cargando el mapa…'}</div>
        )}
      </main>
    </div>
  );
}
