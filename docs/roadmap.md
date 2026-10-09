# Roadmap

Ritmo estimado: 10–12 h semanales (noches entre semana + una sesión larga el fin de semana).

## Fase 1 – v0.1: Electricidad RM

### Semana 1 · Data discovery ✅
- [x] Ficha SEC (`docs/sources/sec`)
- [x] Obtener polígonos oficiales de comunas (BCN, 346 comunas)
- [x] Decisión go/no-go registrada en `docs/decisions.md` (D-009)
- ~~Ficha Enel~~ → movida a la v0.2 (D-009)
- ~~Ficha CGE~~ → movida a la v0.2 (D-009)

### Semana 2 · Base de datos y primer collector ✅
- [x] `docker-compose` con PostgreSQL + PostGIS y Redis
- [x] Esquema inicial de base de datos (`db/migrations`)
- [x] Seeds de comunas y alias de nombres SEC (`db/seeds`)
- [x] Collector SEC (retry, timeout, validación, re-consulta de horas, modo `--watch`)

### Semana 3 · Historial e incidentes
- [x] Backfill gradual del historial SEC
- [x] Lógica que deriva incidentes desde `hourly_outages`
- [x] Tests de derivación (casos sintéticos) y validación con el historial real (temporal 2024, apagón 2025)

### Semana 4 · API ✅
- [x] Monorepo: `apps/api` (NestJS)
- [x] Estado actual por comuna
- [x] Incidentes activos
- [x] Historial de una comuna y métricas básicas
- [x] SSE para actualizaciones en vivo (LISTEN/NOTIFY)
- [x] Ranking de comunas por impacto
- [x] Ids de incidentes estables y recálculo automático en el collector

### Semana 5 · Mapa ✅
- [x] Monorepo: `apps/web` (React + MapLibre)
- [x] Mapa coroplético de comunas (escala "ciudad de noche")
- [x] Panel de detalle con línea de tiempo del incidente
- [x] Indicador "actualizado hace X min" y aviso de datos desactualizados
- [x] Actualización en vivo por SSE
- [x] Buscador de comunas y estadísticas del último año
- [x] Versión para celular

### Semana 6 · Producción y lanzamiento
- [ ] Despliegue (Railway): BD, collector 24/7, API y web
- [ ] HTTPS y dominio
- [ ] CI/CD con GitHub Actions
- [ ] Backups de base de datos
- [ ] Monitoreo y aviso de "datos desactualizados" si una fuente falla
- [ ] Correo a la SEC (contactodau@sec.cl) presentando el proyecto
- [ ] Publicar v0.1

## Fases siguientes
2. Electricidad nacional + fuentes adicionales (Enel, CGE, Chilquinta)
3. Agua potable
4. Transporte público y tránsito
5. Alertas personalizadas

## Reglas
- Hasta publicar v0.1: nada de login, agua, alertas ni app móvil.
- Ideas nuevas → `IDEAS.md`.
- Cada sesión termina con commit + entrada en `DEVLOG.md`.
- Revisión semanal de 15 min (domingo): qué se cumplió, qué se atrasó, qué se recorta.
