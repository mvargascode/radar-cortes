# Radar de Cortes

**Radar de Cortes muestra, en un mapa, qué servicios de los que dependes a diario
están interrumpidos cerca de ti, desde cuándo, y cuánto suelen durar ese tipo de
cortes en tu zona.**

Consolida datos de fuentes oficiales y empresas de servicios, conserva el historial
y lo transforma en información geoespacial y métricas útiles para las personas.

## Alcance actual
**v0.1:** cortes de electricidad en la Región Metropolitana.
Ver la visión completa en [`docs/vision.md`](docs/vision.md) y el plan en [`docs/roadmap.md`](docs/roadmap.md).

## Estado
🔍 Fase 0 – Data discovery (investigación de fuentes de datos).

## Stack (planificado)
| Capa | Tecnología |
|---|---|
| Frontend | React + TypeScript + MapLibre GL JS |
| Backend | Node.js + NestJS |
| Base de datos | PostgreSQL + PostGIS |
| Cache / colas | Redis |
| Workers (ETL) | TypeScript/Node independientes |
| Tiempo real | SSE |
| Infraestructura | Docker, Nginx, GitHub Actions |

## Documentación
| Archivo | Contenido |
|---|---|
| `docs/vision.md` | Qué es el proyecto, criterios de inclusión y visión a largo plazo |
| `docs/roadmap.md` | Fases, semanas y definición de terminado |
| `docs/decisions.md` | Registro de decisiones de arquitectura y producto |
| `docs/sources/` | Ficha de cada fuente de datos investigada |
| `DEVLOG.md` | Bitácora de sesiones de trabajo |
| `IDEAS.md` | Ideas para después de la v0.1 |
| `CLAUDE.md` | Contexto para trabajar con Claude Code |
