# Web · Radar de Cortes

React + TypeScript + MapLibre GL, con Vite. En desarrollo, `/api` se redirige a la API local
(`http://localhost:3000`), así que no hay que configurar CORS.

## Uso
```bash
npm install
npm run dev       # http://localhost:5173 (requiere la API corriendo)
npm run build     # producción en dist/
```

## Cómo funciona
- **Mapa:** polígonos de `/api/comunas` (sin mapa base externo) pintados con el estado de `/api/status`
  mediante *feature-state*, sin recargar la geometría.
- **Escala "ciudad de noche":** con luz, la comuna brilla en ámbar; mientras más clientes sin luz,
  más se apaga. Las comunas con un corte en curso (>= 500 clientes, D-014) llevan contorno claro y etiqueta.
- **Tiempo real:** `EventSource('/api/stream')`; al recibir `update` se vuelve a pedir `/api/status`.
  Respaldo: refresco cada 5 minutos.
- **Detalle:** al elegir una comuna se muestran su corte en curso con la línea de tiempo hora a hora
  y las estadísticas del último año (`/api/comunas/:cut/stats`).

## Notas técnicas
- MapLibre 6 carga su worker con `new URL(..., import.meta.url)`, que no sobrevive al pre-bundling
  de Vite. Por eso el worker se importa con `?worker&url` y se registra con `setWorkerUrl`.
- Las etiquetas del mapa son marcadores HTML (no hace falta un servidor de fuentes) y se ocultan
  cuando se tapan entre sí; gana la comuna con más clientes sin luz.
