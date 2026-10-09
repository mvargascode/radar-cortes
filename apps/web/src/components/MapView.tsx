import * as maplibregl from 'maplibre-gl';
import type { MapGeoJSONFeature } from 'maplibre-gl';
// El worker de MapLibre 6 se empaqueta con Vite y se registra explícitamente
// (su carga automática no sobrevive al pre-bundling de Vite).
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef, useState } from 'react';
import type { Status } from '../api';
import { num } from '../format';
import { fillColorExpression } from '../scale';

interface Props {
  geojson: GeoJSON.FeatureCollection;
  status: Status | null;
  selectedCut: string | null;
  onSelect: (cut: string | null) => void;
}

maplibregl.setWorkerUrl(workerUrl);

const NIGHT = '#0F1B2D';
const GRAN_SANTIAGO: [number, number, number, number] = [-70.86, -33.66, -70.47, -33.31];

function pad([a, b, c, d]: [number, number, number, number], k: number): [number, number, number, number] {
  const dx = (c - a) * k;
  const dy = (d - b) * k;
  return [a - dx, b - dy, c + dx, d + dy];
}

/** Oculta las etiquetas que se tapan entre sí (gana la de más clientes, que va primero). */
function declutter(els: HTMLElement[]) {
  const placed: DOMRect[] = [];
  for (const el of els) {
    el.style.visibility = 'visible';
    const r = el.getBoundingClientRect();
    const hit = placed.some((p) => !(r.right < p.left || r.left > p.right || r.bottom < p.top || r.top > p.bottom));
    if (hit) el.style.visibility = 'hidden';
    else placed.push(r);
  }
}

/** Aplica cambios al mapa solo cuando la fuente existe (evita carreras al montar/desmontar). */
function safely(m: maplibregl.Map, fn: () => void) {
  if (!m.getSource('comunas')) return;
  try {
    fn();
  } catch (err) {
    console.warn('[mapa]', err);
  }
}

function bboxOf(fc: GeoJSON.FeatureCollection): [number, number, number, number] {
  let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      const [x, y] = c as number[];
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    } else if (Array.isArray(c)) c.forEach(visit);
  };
  fc.features.forEach((f) => f.geometry && 'coordinates' in f.geometry && visit(f.geometry.coordinates));
  return [minX, minY, maxX, maxY];
}

export function MapView({ geojson, status, selectedCut, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; cut: string; nombre: string } | null>(null);
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // Crear el mapa una sola vez.
  useEffect(() => {
    if (!container.current) return;
    const m = new maplibregl.Map({
      container: container.current,
      style: { version: 8, sources: {}, layers: [{ id: 'night', type: 'background', paint: { 'background-color': NIGHT } }] },
      // Vista inicial en el Gran Santiago; al alejar se ve la región completa.
      bounds: GRAN_SANTIAGO,
      fitBoundsOptions: { padding: 16 },
      maxBounds: pad(bboxOf(geojson), 0.6),
      attributionControl: false,
      dragRotate: false,
      pitchWithRotate: false,
    });
    m.touchZoomRotate.disableRotation();
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    m.addControl(new maplibregl.AttributionControl({ customAttribution: 'Datos: SEC. Límites comunales: BCN' }), 'bottom-left');

    m.on('load', () => {
      m.addSource('comunas', { type: 'geojson', data: geojson, promoteId: 'cut' });
      m.addLayer({
        id: 'comunas-fill',
        type: 'fill',
        source: 'comunas',
        paint: { 'fill-color': fillColorExpression, 'fill-opacity': 0.8 },
      });
      m.addLayer({
        id: 'comunas-line',
        type: 'line',
        source: 'comunas',
        paint: { 'line-color': NIGHT, 'line-width': ['interpolate', ['linear'], ['zoom'], 8, 1, 12, 2.5] },
      });
      // Contorno de las comunas con un corte en curso.
      m.addLayer({
        id: 'comunas-open',
        type: 'line',
        source: 'comunas',
        paint: {
          'line-color': '#FFF3D6',
          'line-width': 1.6,
          'line-opacity': ['case', ['boolean', ['feature-state', 'open'], false], 0.9, 0],
        },
      });
      m.addLayer({
        id: 'comunas-selected',
        type: 'line',
        source: 'comunas',
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 3,
          'line-opacity': ['case', ['boolean', ['feature-state', 'selected'], false], 1, 0],
        },
      });
      setReady(true);
    });

    m.on('mousemove', 'comunas-fill', (e) => {
      const f = e.features?.[0] as MapGeoJSONFeature | undefined;
      if (!f) return;
      m.getCanvas().style.cursor = 'pointer';
      setHover({ x: e.point.x, y: e.point.y, cut: String(f.properties.cut), nombre: String(f.properties.nombre) });
    });
    m.on('mouseleave', 'comunas-fill', () => {
      m.getCanvas().style.cursor = '';
      setHover(null);
    });
    m.on('click', (e) => {
      const f = m.queryRenderedFeatures(e.point, { layers: ['comunas-fill'] })[0];
      onSelectRef.current(f ? String(f.properties.cut) : null);
    });

    map.current = m;
    return () => {
      setReady(false);
      m.remove();
      map.current = null;
    };
  }, [geojson]);

  // Pintar el estado actual y las etiquetas de los cortes en curso.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m || !status) return;
    safely(m, () => {
      for (const c of status.comunas) {
        m.setFeatureState({ source: 'comunas', id: c.cut }, { clientes: c.clientes, open: Boolean(c.incidente) });
      }
    });
    markers.current.forEach((mk) => mk.remove());
    markers.current = status.comunas
      .filter((c) => c.incidente)
      .map((c) => {
        const feature = geojson.features.find((f) => f.properties?.cut === c.cut);
        const label = feature?.properties?.label as [number, number] | undefined;
        if (!label) return null;
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'map-label';
        el.innerHTML = `<span class="map-label-name"></span><span class="map-label-value"></span>`;
        el.querySelector('.map-label-name')!.textContent = c.nombre;
        el.querySelector('.map-label-value')!.textContent = num(c.clientes);
        el.setAttribute('aria-label', `${c.nombre}: ${num(c.clientes)} clientes sin luz`);
        el.addEventListener('click', (ev) => {
          ev.stopPropagation();
          onSelectRef.current(c.cut);
        });
        return new maplibregl.Marker({ element: el }).setLngLat(label).addTo(m);
      })
      .filter((x): x is maplibregl.Marker => x !== null);
    const els = markers.current.map((mk) => mk.getElement());
    const run = () => declutter(els);
    requestAnimationFrame(run);
    m.on('moveend', run);
    return () => {
      m.off('moveend', run);
    };
  }, [ready, status, geojson]);

  // Marcar la comuna seleccionada.
  useEffect(() => {
    const m = map.current;
    if (!ready || !m) return;
    safely(m, () => {
      m.removeFeatureState({ source: 'comunas' }, 'selected');
      if (selectedCut) m.setFeatureState({ source: 'comunas', id: selectedCut }, { selected: true });
    });
  }, [ready, selectedCut]);

  const hovered = hover && status?.comunas.find((c) => c.cut === hover.cut);

  return (
    <div className="map-wrap">
      <div ref={container} className="map" role="region" aria-label="Mapa de comunas de la Región Metropolitana" />
      {hover && (
        <div className="map-tooltip" style={{ left: hover.x, top: hover.y }}>
          <strong>{hover.nombre}</strong>
          <span>{hovered ? `${num(hovered.clientes)} clientes sin luz` : 'Sin datos'}</span>
        </div>
      )}
    </div>
  );
}

