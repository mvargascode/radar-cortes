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

## D-009 · La SEC es la única fuente de la v0.1 (2026-10-04)
La SEC cubre todas las distribuidoras y comunas, y entrega historial por hora
(probado hasta agosto de 2024). Enel y CGE pasan a la v0.2 como enriquecimiento.

## D-010 · Re-consulta de horas cerradas (2026-10-04)
La hora en curso cambia mientras transcurre y las horas pasadas pueden corregirse.
El collector guarda la hora actual "en vivo" y vuelve a consultar las horas
recientes para quedarse con su valor definitivo.

## D-011 · Acceso responsable a la SEC (2026-10-04)
Las Normas de Uso no restringen la reutilización de información pública.
El collector consulta cada 10–15 min, se identifica con User-Agent y contacto,
descarga el historial de forma gradual y la interfaz cita a la SEC como fuente.

## D-012 · Significado de 'partial' (2026-10-06)
Una hora es 'partial' solo si hay nombres sin traducir (requieren acción).
Las filas sin nombre que envía la SEC se registran como anomalía, pero no
marcan la hora como parcial. Las correcciones de alias se aplican con
`npm run reprocess`, que recalcula desde raw_responses sin consultar a la SEC.

## D-013 · Cambio de horario y huecos de datos (2026-10-07)
La SEC usa hora local de Chile. En el cambio de horario de abril, la hora
repetida existe una sola vez para la SEC: se guarda en su primera ocurrencia y
la segunda queda sin datos por diseño. Las horas sin datos (incluidos los
huecos de la fuente) no se interpretan como "cero cortes", y la derivación de
incidentes no debe cerrar un incidente por un hueco de una hora.

## D-014 · Reglas de derivación de incidentes (2026-10-08)
Basadas en el historial de la RM (2024-2026): las comunas tienen algún cliente sin
luz el 85-98% de las horas, con mediana de 5-24 clientes (ruido de fondo).
Simulación por umbral (RM, incidentes/año): 50 → 7.135 · 100 → 5.717 · 500 → 2.604 · 1.000 → 1.729.
- Apertura: >= 500 clientes afectados en una hora (sobre el p95 de casi todas las comunas).
- Cierre: 2 horas consultadas seguidas bajo 500 (un corte que "parpadea" no se parte).
- Huecos de datos no cierran el incidente, salvo que superen 6 horas.
- Gravedad: peak de clientes y cliente-horas.
- Estado abierto: DETECTED (1 hora) o ACTIVE (2 o más). Cerrado: RESTORED.
- El ruido de fondo no se descarta: el mapa muestra el estado actual desde hourly_outages.
Limitación: el umbral es absoluto porque la SEC no entrega el total de clientes por comuna.
`npm run derive` recalcula todos los incidentes (idempotente).

## D-015 · Diseño de la API (2026-10-08)
- NestJS con SQL directo sobre `pg` (sin ORM): PostGIS y las estadísticas se expresan mejor en SQL.
- Validación de parámetros con zod (respuesta 400 con el detalle).
- Ids de incidentes estables: la derivación hace upsert sobre (source, type, cut, started_at)
  y elimina los que ya no existen (migración 003). Los enlaces a `/incidents/:id` no se rompen.
- El collector `--watch` recalcula incidentes en cada ciclo y avisa con `NOTIFY radar_updates`;
  la API escucha con `LISTEN` y lo reenvía por SSE (`/api/stream`).
- `stale` = la última ingesta exitosa tiene más de 35 minutos (el ciclo es de 15).
- En la línea de tiempo, una hora sin datos se entrega como `null`, no como 0 (D-013).


## D-016 · Frontend (2026-10-08)
- React + TypeScript + MapLibre GL con Vite (React elegido para sumar tecnología; el autor trabaja en Vue).
- Sin mapa base externo: las comunas dibujan la ciudad. Cero dependencias de servicios de tiles y sin API keys.
- Escala "ciudad de noche": con luz, la comuna brilla en ámbar; con más clientes sin luz, se apaga.
  Tramos: <100, 100-499, 500-1.999, 2.000-9.999, >=10.000. La información nunca depende solo del color:
  el panel lista los cortes con cifras.
- Vista inicial en el Gran Santiago; la región completa queda disponible al alejar.
- Tiempo real con SSE (D-015) y refresco de respaldo cada 5 minutos.
- Hora en formato 24 h, zona America/Santiago.
