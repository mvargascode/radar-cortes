-- Radar de Cortes · Esquema inicial (v0.1)
-- Ver docs/database.md para el detalle de cada tabla.

CREATE EXTENSION IF NOT EXISTS postgis;

-- Catálogo oficial de comunas (código CUT)
CREATE TABLE comunas (
  cut            text PRIMARY KEY,
  nombre         text NOT NULL,
  region_cut     text NOT NULL,
  region_nombre  text NOT NULL,
  geom           geometry(MultiPolygon, 4326)
);
CREATE INDEX comunas_geom_idx ON comunas USING GIST (geom);
CREATE INDEX comunas_region_idx ON comunas (region_cut);

-- Traducción de nombres de cada fuente al código oficial
CREATE TABLE comuna_aliases (
  source      text NOT NULL,
  raw_region  text NOT NULL,
  raw_comuna  text NOT NULL,
  cut         text NOT NULL REFERENCES comunas (cut),
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (source, raw_region, raw_comuna)
);

-- Cada ejecución del collector
CREATE TABLE ingestion_runs (
  id             bigserial PRIMARY KEY,
  source         text NOT NULL,
  started_at     timestamptz NOT NULL DEFAULT now(),
  finished_at    timestamptz,
  status         text NOT NULL DEFAULT 'running'
                 CHECK (status IN ('running', 'success', 'failed', 'partial')),
  http_status    integer,
  rows_received  integer,
  error          text
);
CREATE INDEX ingestion_runs_source_started_idx ON ingestion_runs (source, started_at DESC);

-- Respuestas crudas, tal como llegaron
CREATE TABLE raw_responses (
  id            bigserial PRIMARY KEY,
  run_id        bigint NOT NULL REFERENCES ingestion_runs (id),
  source        text NOT NULL,
  period_start  timestamptz NOT NULL,
  fetched_at    timestamptz NOT NULL DEFAULT now(),
  payload       jsonb NOT NULL
);
CREATE INDEX raw_responses_source_period_idx ON raw_responses (source, period_start);

-- Horas consultadas con éxito ("cero" vs "sin datos")
CREATE TABLE fetched_hours (
  source           text NOT NULL,
  period_start     timestamptz NOT NULL,
  last_fetched_at  timestamptz NOT NULL DEFAULT now(),
  is_final         boolean NOT NULL DEFAULT false,
  PRIMARY KEY (source, period_start)
);

-- Mejor valor conocido por comuna y hora
CREATE TABLE hourly_outages (
  source              text NOT NULL,
  cut                 text NOT NULL REFERENCES comunas (cut),
  period_start        timestamptz NOT NULL,
  clientes_afectados  integer NOT NULL CHECK (clientes_afectados > 0),
  first_seen_at       timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  revisions           integer NOT NULL DEFAULT 0,
  PRIMARY KEY (source, cut, period_start)
);
CREATE INDEX hourly_outages_cut_period_idx ON hourly_outages (cut, period_start);
CREATE INDEX hourly_outages_period_idx ON hourly_outages (period_start);

-- Incidentes derivados (modelo genérico)
CREATE TABLE incidents (
  id             bigserial PRIMARY KEY,
  type           text NOT NULL DEFAULT 'POWER_OUTAGE',
  source_type    text NOT NULL DEFAULT 'UNKNOWN'
                 CHECK (source_type IN ('PROGRAMMED', 'UNPLANNED', 'UNKNOWN')),
  status         text NOT NULL
                 CHECK (status IN ('DETECTED', 'ACTIVE', 'RESTORED')),
  source         text NOT NULL,
  cut            text REFERENCES comunas (cut),
  geom           geometry(Geometry, 4326),
  started_at     timestamptz NOT NULL,
  ended_at       timestamptz,
  peak_clientes  integer,
  peak_at        timestamptz,
  cliente_horas  bigint NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX incidents_cut_started_idx ON incidents (cut, started_at DESC);
CREATE INDEX incidents_open_idx ON incidents (status) WHERE status <> 'RESTORED';
