/** Tipos y llamadas a la API (/api, con proxy de Vite en desarrollo). */

export interface OpenIncident {
  id: number;
  status: 'DETECTED' | 'ACTIVE';
  startedAt: string;
  peakClientes: number;
}

export interface ComunaStatus {
  cut: string;
  nombre: string;
  clientes: number;
  incidente: OpenIncident | null;
}

export interface Status {
  latestPeriod: string | null;
  lastSuccessAt: string | null;
  stale: boolean;
  totalClientes: number;
  comunasConCortes: number;
  incidentesAbiertos: number;
  comunas: ComunaStatus[];
}

export interface IncidentSummary {
  id: number;
  status: 'DETECTED' | 'ACTIVE' | 'RESTORED';
  startedAt: string;
  endedAt: string | null;
  duracionHoras: number;
  peakClientes: number;
  clienteHoras: number;
}

export interface IncidentDetail extends IncidentSummary {
  peakAt: string;
  comuna: { cut: string; nombre: string };
  timeline: { t: string; clientes: number | null }[];
}

export interface ComunaStats {
  comuna: { cut: string; nombre: string };
  days: number;
  incidentes: number;
  clienteHoras: number;
  peakMax: number | null;
  duracionMedianaHoras: number | null;
  peores: IncidentSummary[];
  porMes: { mes: string; incidentes: number; clienteHoras: number }[];
  porHoraDelDia: { hora: number; incidentes: number }[];
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api${path}`, { signal });
  if (!res.ok) throw new Error(`La API respondió ${res.status} en ${path}`);
  return res.json() as Promise<T>;
}

export const api = {
  comunas: (signal?: AbortSignal) => get<GeoJSON.FeatureCollection>('/comunas?region=13', signal),
  status: (signal?: AbortSignal) => get<Status>('/status?region=13', signal),
  incident: (id: number, signal?: AbortSignal) => get<IncidentDetail>(`/incidents/${id}`, signal),
  comunaStats: (cut: string, signal?: AbortSignal) => get<ComunaStats>(`/comunas/${cut}/stats?days=365`, signal),
};
