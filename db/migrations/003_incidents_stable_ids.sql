-- Un incidente se identifica por (fuente, tipo, comuna, inicio). Permite recalcular
-- los incidentes con upsert sin cambiar sus ids (los enlaces de la API se mantienen).
CREATE UNIQUE INDEX IF NOT EXISTS incidents_natural_key
  ON incidents (source, type, cut, started_at);
