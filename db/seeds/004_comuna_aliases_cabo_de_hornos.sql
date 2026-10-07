-- Alias detectado en el backfill de 2024 (2026-10-06).
-- La SEC usaba el nombre antiguo de la comuna (ex Navarino).
INSERT INTO comuna_aliases (source, raw_region, raw_comuna, cut) VALUES
  ('sec', 'Magallanes', 'Cabo de Hornos (ex-Navarino)', '12201')
ON CONFLICT DO NOTHING;
