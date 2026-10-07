# Fuente: SEC – Clientes sin suministro

- **URL pública (página):** https://www.sec.cl/interrupciones-en-linea/ (WordPress que enlaza a la app)
- **Aplicación:** https://apps.sec.cl/INTONLINEv1/index.aspx
- **Formato:** JSON (`application/json; charset=utf-8`)
- **Granularidad:** comuna (nacional, todas las regiones en una sola respuesta)
- **¿Incluye distribuidora?:** No
- **¿Incluye timestamp propio?:** No en GetPorFecha. Usar header `Date` de la respuesta o `GetHoraServer`.
- **Frecuencia real de actualización:** la hora en curso se actualiza mientras transcurre, y las horas pasadas pueden corregirse después (2026-09-30 0:00: 5.204 capturado a las 00:36 → 5.180 consultado el 2026-10-04).
- **Identificadores estables:** No hay códigos. Solo nombres de región y comuna (ver Notas).
- **¿Solo estado actual o también historial?:** Sí hay historial, una foto por hora, al menos desde 2024 (probado con 2024-08-02 12:00: 716.423 clientes en la RM).
- **robots.txt / términos de uso:** Normas de Uso (leídas 2026-10-04): son una política de privacidad y los términos de las aplicaciones con clave. No mencionan reutilización de información pública ni prohíben el acceso automatizado. La SEC indica que monitorea el tráfico de red: consultar con baja frecuencia, identificarse con User-Agent y citar la fuente. Contacto: contactodau@sec.cl
- **Riesgos:** endpoint interno no documentado (puede cambiar sin aviso); nombres de comuna sin normalizar.
- **Muestras guardadas:** `GetPorFecha-2026-09-30-0045.json`, `GetPorFecha-2026-10-04-0015.json`, `GetPorFecha-2024-08-02-12-0026.json`
- **Veredicto:** usable

## Endpoints

### GetPorFecha (principal)
- `POST https://apps.sec.cl/INTONLINEv1/ClientesAfectados/GetPorFecha`
- Headers necesarios (probable): `Content-Type: application/json; charset=UTF-8`
- Body: `{"anho":2026,"mes":9,"dia":30,"hora":0}`
- Respuesta: arreglo de objetos
  ```json
  {"NOMBRE_REGION": "Metropolitana", "NOMBRE_COMUNA": "Maipu", "CLIENTES_AFECTADOS": 1807}
  ```

```bash
curl 'https://apps.sec.cl/INTONLINEv1/ClientesAfectados/GetPorFecha' \
  -H 'content-type: application/json; charset=UTF-8' \
  -H 'referer: https://apps.sec.cl/INTONLINEv1/index.aspx' \
  --data-raw '{"anho":2026,"mes":9,"dia":30,"hora":0}'
```

### Otros (pendiente documentar)
- `GetClientesNacional` – total nacional
- `GetHoraServer` – hora del servidor
- `Get` – pendiente

## Notas
- Muestra 2026-09-30 00:36 (hora Chile): 135 comunas, 16 regiones, 5.204 clientes afectados; 34 comunas de la RM.
- **Solo aparecen comunas con clientes afectados.** Una comuna ausente se interpreta como 0,
  pero no permite distinguir "sin cortes" de "sin datos".
- Nombres inconsistentes: sin tildes ("Maipu", "Conchali"), pero con ñ ("Peñaflor", "Ñuñoa"),
  y "O`Higgins" con acento grave. Se necesita tabla de normalización nombre → código de comuna.
- Según la SEC, los datos provienen de cargas de las distribuidoras y pueden variar en el tiempo:
  un snapshot puede corregirse después.
- Temporal 2024-08-02 12:00: 299 comunas, 1.176.268 clientes en total; RM 716.423 (Las Condes 60.022, Maipú 55.935, Pudahuel 48.819). Sirve como fixture histórico.
- Historial descargado: 2024-01-01 a 2026-10-07 (~24.000 horas).
- Hueco conocido de la fuente: 2025-01-03 03:00–07:00 (hora de Chile); la SEC responde vacío.
- Nombre antiguo en 2024: "Cabo de Hornos (ex-Navarino)" → Cabo de Hornos (12201).
- Filas sin región ni comuna: ~1.200 horas, ~1.800 clientes en total. Irrecuperables.
- Hora repetida del cambio de horario de abril: sin datos por diseño (D-013).