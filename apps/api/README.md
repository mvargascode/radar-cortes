# API · Radar de Cortes

NestJS + PostgreSQL/PostGIS. Consultas SQL directas (sin ORM): las consultas geoespaciales y
estadísticas se leen mejor en SQL. Usa el `.env` de la raíz del repo.

## Uso
```bash
npm install
npm run dev      # desarrollo con recarga: http://localhost:3000/api
npm test         # tests e2e (solo lectura) contra la BD del .env
npm run build && npm start   # producción
```

## Endpoints (prefijo `/api`)

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/health` | Estado de la BD y frescura de los datos (`stale` si el collector lleva >35 min sin éxito) |
| GET | `/comunas?region=13` | Polígonos de las comunas (GeoJSON, simplificados, cacheables 1 día) |
| GET | `/status?region=13` | Estado actual: clientes sin luz por comuna en la última hora + incidente abierto |
| GET | `/incidents` | Lista con filtros: `status=open\|restored\|all`, `region`, `cut`, `from`, `to`, `sort=recent\|impact`, `limit`, `offset` |
| GET | `/incidents/:id` | Detalle con línea de tiempo hora a hora (`clientes: null` = hora sin datos) |
| GET | `/comunas/:cut/stats?days=365` | Estadísticas de una comuna: incidentes, duración mediana, peores cortes, por mes y por hora del día |
| GET | `/stats/comunas?region=13&days=365` | Ranking de comunas por impacto (cliente-horas) |
| GET | `/stream` | Server-Sent Events: `update` cuando hay datos nuevos, `ping` cada 25 s |

## Tiempo real
El collector, en modo `--watch`, recalcula los incidentes y ejecuta `NOTIFY radar_updates`.
La API escucha ese canal (`LISTEN`) y lo reenvía por SSE. El frontend, al recibir `update`,
vuelve a pedir `/status`. No hay polling a la base de datos.
