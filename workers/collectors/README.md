# Collector SEC

Consulta `GetPorFecha` de la SEC y guarda los datos en PostgreSQL.

## Requisitos
- Node.js 20 o superior
- Base de datos levantada con `docker compose up -d` (desde la raíz del repo)
- Seeds de comunas y alias cargados

Usa el `.env` de la raíz del repo (POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DB_PORT).

## Uso
```bash
npm install
npm test                                        # tests unitarios
npm run collect                                 # un ciclo: 2 horas cerradas + hora en curso
npm run collect -- --date 2024-08-02 --hour 12  # una hora específica (hora de Chile)
npm run collect -- --watch                      # ciclo cada 15 min (Ctrl+C para detener)
npm run derive -- --dry-run                     # simula la derivación de incidentes
npm run derive                                  # recalcula todos los incidentes (D-014)
```

## Qué hace cada ciclo
1. Registra la ejecución en `ingestion_runs`.
2. Consulta la SEC (timeout, 3 reintentos, validación de esquema con zod).
3. Guarda la respuesta cruda en `raw_responses`.
4. Traduce nombres a código CUT: alias exacto → nombre normalizado → anomalía.
5. Actualiza `hourly_outages` (cuenta revisiones) y elimina las comunas que volvieron a 0.
6. Marca la hora en `fetched_hours` (`is_final` para horas cerradas, D-010).
