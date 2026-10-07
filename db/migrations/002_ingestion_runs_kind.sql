-- Distingue ejecuciones que consultan la fuente ('fetch') de las que
-- recalculan desde raw_responses sin consultarla ('reprocess').
ALTER TABLE ingestion_runs
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'fetch'
  CHECK (kind IN ('fetch', 'reprocess'));
