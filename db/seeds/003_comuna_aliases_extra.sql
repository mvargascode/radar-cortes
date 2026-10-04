-- Alias detectados durante el backfill (2026-10-04).
-- "Sierra;rda": nombre corrupto en origen (SEC); corresponde a Sierra Gorda.
INSERT INTO comuna_aliases (source, raw_region, raw_comuna, cut) VALUES
  ('sec', 'Antofagasta', 'Sierra;rda', '02103'),
  ('sec', 'Los Lagos', 'Chaiten', '10401'),
  ('sec', 'Los Rios', 'Corral', '14102'),
  ('sec', 'Magallanes', 'Porvenir', '12301'),
  ('sec', 'Magallanes', 'Punta Arenas', '12101'),
  ('sec', 'Valparaiso', 'Hijuelas', '05503')
ON CONFLICT DO NOTHING;