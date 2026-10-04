# Diseño de base de datos (v0.1 – borrador)

PostgreSQL + PostGIS. Principios: los datos crudos se guardan siempre (D-004),
"cero cortes" y "sin datos" son cosas distintas, y los incidentes se derivan (D-005).

## Flujo

```
SEC (GetPorFecha) → raw_responses → hourly_outages + fetched_hours → incidents
                         ↑
                  comuna_aliases (normaliza nombres → código CUT)
```

## Tablas

### comunas
Catálogo oficial con geometría. Clave: código CUT (Código Único Territorial).

| columna | tipo | nota |
|---|---|---|
| cut | text PK | ej. "13119" (Maipú) |
| nombre | text | nombre oficial con tildes |
| region_cut | text | ej. "13" |
| region_nombre | text | |
| geom | geometry(MultiPolygon, 4326) | índice GIST |

### comuna_aliases
Traduce los nombres que entrega cada fuente al código oficial.

| columna | tipo | nota |
|---|---|---|
| source | text | "sec" |
| raw_region | text | tal como viene: "Metropolitana" |
| raw_comuna | text | tal como viene: "Maipu" |
| cut | text FK → comunas | |

PK: (source, raw_region, raw_comuna). Un nombre sin alias se registra como error de ingesta, no se descarta en silencio.

### ingestion_runs
Cada ejecución del collector. Base de la observabilidad.

| columna | tipo |
|---|---|
| id | bigserial PK |
| source | text |
| started_at / finished_at | timestamptz |
| status | text (success / failed / partial) |
| http_status | int |
| rows_received | int |
| error | text |

### raw_responses
Respuesta cruda tal cual llegó. Permite reprocesar todo si cambia la lógica.

| columna | tipo |
|---|---|
| id | bigserial PK |
| run_id | FK → ingestion_runs |
| source | text |
| period_start | timestamptz (hora consultada) |
| fetched_at | timestamptz |
| payload | jsonb |

### fetched_hours
Qué horas se consultaron con éxito. Resuelve "cero vs. sin datos":
si la hora está aquí y la comuna no aparece en hourly_outages → 0 clientes.
Si la hora no está aquí → sin datos.

| columna | tipo | nota |
|---|---|---|
| source | text | |
| period_start | timestamptz | |
| last_fetched_at | timestamptz | |
| is_final | boolean | true cuando la hora ya cerró y se re-consultó (D-010) |

PK: (source, period_start).

### hourly_outages
Mejor valor conocido por comuna y hora (upsert en cada re-consulta).

| columna | tipo |
|---|---|
| source | text |
| cut | text FK → comunas |
| period_start | timestamptz |
| clientes_afectados | int (> 0) |
| first_seen_at / updated_at | timestamptz |
| revisions | int (cuántas veces cambió el valor) |

PK: (source, cut, period_start). Índice por (cut, period_start).

### incidents
Derivados de hourly_outages. Modelo genérico (D-006).

| columna | tipo | nota |
|---|---|---|
| id | bigserial PK | |
| type | text | POWER_OUTAGE |
| source_type | text | PROGRAMMED / UNPLANNED / UNKNOWN (SEC → UNKNOWN) |
| status | text | DETECTED / ACTIVE / RESTORED |
| source | text | |
| cut | text FK → comunas | null si la geometría es propia |
| geom | geometry(Geometry, 4326) | null en v0.1 (se usa la de la comuna) |
| started_at / ended_at | timestamptz | resolución horaria |
| peak_clientes / peak_at | int / timestamptz | |
| cliente_horas | bigint | suma de clientes × horas (impacto) |

## Regla de derivación de incidentes (propuesta)
- Se abre cuando una comuna pasa de 0 a > 0 clientes.
- Sigue ACTIVE mientras haya clientes afectados.
- Se cierra (RESTORED) tras 1 hora completa en 0.
- Duración con resolución horaria: el sistema no afirma precisión de minutos.

## Notas abiertas
- **Zona horaria:** el parámetro `hora` de la SEC es hora local de Chile. Convertir
  con America/Santiago; cuidado con la hora repetida/omitida en los cambios de horario.
- **Backfill histórico:** ~2 años ≈ 17.500 horas = 17.500 peticiones. A 1 petición
  cada 10 s ≈ 2 días. Ejecutar gradualmente (D-011).
- **Geometrías:** obtener polígonos oficiales de comunas con código CUT.
