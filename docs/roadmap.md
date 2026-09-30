# Roadmap

Ritmo estimado: 10–12 h semanales (noches entre semana + una sesión larga el fin de semana).

## Fase 1 – v0.1: Electricidad RM

### Semana 1 · Data discovery
- [ ] Ficha SEC (`docs/sources/sec`)
- [ ] Ficha Enel (`docs/sources/enel`)
- [ ] Ficha CGE (`docs/sources/cge`)
- [ ] Obtener polígonos oficiales de comunas de la RM
- [ ] Decisión go/no-go registrada en `docs/decisions.md`

### Semana 2 · Esqueleto y primer collector
- [ ] Monorepo: `apps/api`, `apps/web`, `workers/collectors`
- [ ] `docker-compose` con PostgreSQL + PostGIS y Redis
- [ ] Collector SEC guardando snapshots cada 15 min (retry, timeout, validación)
- [ ] **Collector desplegado 24/7** (el historial empieza a acumularse)

### Semana 3 · Modelo de datos e incidentes
- [ ] Comunas cargadas en PostGIS
- [ ] Tablas de snapshots e incidentes
- [ ] Lógica que deriva incidentes desde snapshots
- [ ] Tests con fixtures reales de la Fase 0

### Semana 4 · API
- [ ] Estado actual por comuna
- [ ] Incidentes activos
- [ ] Historial de una comuna y métricas básicas
- [ ] SSE para actualizaciones en vivo

### Semana 5 · Mapa
- [ ] Mapa coroplético de comunas (MapLibre)
- [ ] Panel de detalle con línea de tiempo del incidente
- [ ] Indicador "actualizado hace X min"

### Semana 6 · Producción y lanzamiento
- [ ] Nginx + HTTPS
- [ ] CI/CD con GitHub Actions
- [ ] Backups de base de datos
- [ ] Monitoreo y aviso de "datos desactualizados" si una fuente falla
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
