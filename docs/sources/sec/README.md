# Fuente: SEC – Clientes sin suministro

- **URL pública (página):** https://www.sec.cl/interrupciones-en-linea/ (WordPress que enlaza a la app)
- **Aplicación:** https://apps.sec.cl/INTONLINEv1/index.aspx
- **Formato:** JSON (`application/json; charset=utf-8`)
- **Granularidad:** comuna (nacional, todas las regiones en una sola respuesta)
- **¿Incluye distribuidora?:** No
- **¿Incluye timestamp propio?:** No en GetPorFecha. Usar header `Date` de la respuesta o `GetHoraServer`.
- **Frecuencia real de actualización:** pendiente (comparar dos capturas separadas por 15 min)
- **Identificadores estables:** No hay códigos. Solo nombres de región y comuna (ver Notas).
- **¿Solo estado actual o también historial?:** pendiente. El payload recibe año, mes, día y hora: probar si acepta horas/fechas pasadas.
- **robots.txt / términos de uso:** pendiente. Revisar https://www.sec.cl/area-ciudadana/normas-de-uso/
- **Riesgos:** endpoint interno no documentado (puede cambiar sin aviso); nombres de comuna sin normalizar.
- **Muestras guardadas:** `GetPorFecha-2026-09-30-0045.json`
- **Veredicto:** usable (preliminar, pendiente frecuencia y condiciones de uso)

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