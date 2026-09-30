# Decisiones

## D-001 · Nombre: Radar de Cortes (2026-09-29)
"InfraChile" descartado: ya es el nombre del encuentro anual del Consejo de
Políticas de Infraestructura (infrachile.com). "Cortes" permite crecer de luz a
agua, transporte y tránsito. Plan B: "Cortómetro".

## D-002 · Concepto central: interrupciones (2026-09-29)
El proyecto trata sobre interrupciones de servicios. Solo entra lo que tiene
inicio y fin, ubicación y una fuente confiable (ver docs/vision.md).

## D-003 · Alcance v0.1: electricidad, Región Metropolitana (2026-09-29)
Nada de agua, incendios, alertas, login ni app móvil hasta publicar v0.1.

## D-004 · Snapshots como fuente de verdad (2026-09-29)
Se guardan capturas crudas de cada fuente (comuna, fuente, clientes afectados,
timestamp). Los incidentes se DERIVAN de los snapshots, nunca al revés.

## D-005 · Estados honestos (2026-09-29)
- Estado del incidente: DETECTED → ACTIVE → RESTORED
- Tipo según la fuente: PROGRAMMED | UNPLANNED | UNKNOWN
No se inventan estados operacionales ("en reparación") si la fuente no los entrega.

## D-006 · Modelo de incidentes genérico (2026-09-29)
El incidente tiene tipo, estado, severidad, fuente, tiempos y geometría
(POINT / LINESTRING / POLYGON), para sumar nuevos tipos sin rediseñar.

## D-007 · ETL en código TypeScript (2026-09-29)
Collectors con retry, timeout, validación de esquema, logging y tests con
fixtures reales. n8n solo para automatizaciones secundarias.

## D-008 · Data discovery antes de programar (2026-09-29)
Cada fuente se documenta en docs/sources/<fuente>/README.md y se evalúa
(usable / frágil / descartada), incluyendo condiciones de uso.
Consultas de baja frecuencia (10–15 min).
