# Contexto para Claude Code

## Proyecto
Radar de Cortes: mapa de interrupciones de servicios en Chile.
v0.1 = electricidad en la Región Metropolitana. Ver docs/vision.md y docs/roadmap.md.

## Reglas de arquitectura (no romper)
- Los snapshots crudos son la fuente de verdad; los incidentes se derivan de ellos.
- Estados: DETECTED → ACTIVE → RESTORED. Tipo: PROGRAMMED | UNPLANNED | UNKNOWN.
  Nunca inventar estados que la fuente no entrega.
- Collectors en TypeScript con retry, timeout, validación de esquema y logging.
- Consultar fuentes externas con baja frecuencia (10–15 min).
- Todo cambio de lógica de ingesta lleva tests con fixtures de docs/sources/.

## Stack
React + TS + MapLibre · NestJS · PostgreSQL + PostGIS · Redis · SSE · Docker.

## Convenciones
- Commits: Conventional Commits (feat:, fix:, docs:, chore:, test:).
- Código e identificadores en inglés; documentación en español.
- Decisiones nuevas se registran en docs/decisions.md.

## Estado actual
Fase 0 – data discovery. Aún no hay código de aplicación.
