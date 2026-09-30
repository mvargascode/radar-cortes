# Visión

## Qué es
Radar de Cortes muestra, en un mapa, qué servicios de los que dependes a diario
están interrumpidos cerca de ti, desde cuándo, y cuánto suelen durar ese tipo de
cortes en tu zona.

La idea central no es "luz" ni "agua", sino **interrupciones**.

## Criterios de inclusión
Un tipo de dato entra al proyecto solo si cumple las tres condiciones:

1. **Tiene inicio y fin**: es un corte, no un lugar fijo.
2. **Tiene ubicación**: un punto, una calle o una zona.
3. **Existe una fuente confiable** que lo informa.

Queda fuera a propósito: directorios de lugares ("qué tengo cerca"),
puntos de reciclaje y cualquier dato sin inicio/fin.

## Qué nos diferencia
- **Unificación:** varias fuentes y empresas en un solo mapa.
- **Historial:** las fuentes muestran el estado actual; nosotros guardamos la
  evolución y calculamos duraciones, frecuencia y comunas más afectadas.
- **Honestidad de los datos:** el sistema no afirma más de lo que sabe.

## Tipos de interrupción (orden tentativo)
1. Electricidad – Región Metropolitana (v0.1)
2. Electricidad – nacional
3. Agua potable (cortes programados y de emergencia)
4. Transporte público (estaciones/tramos cerrados, desvíos)
5. Tránsito y rutas (calles cortadas, rutas cerradas, pasos fronterizos)
6. Telecomunicaciones (probablemente con reportes de usuarios)

## Capa de contexto
Alertas meteorológicas y de emergencia: no son cortes, pero los explican
(ej.: sistema frontal → aumento de cortes en ciertas comunas).

## Largo plazo
- Alertas por dirección ("avísame si cortan la luz o el agua en mi casa")
- Reportes por comuna: frecuencia de cortes y tiempos de reposición por empresa
- API pública para periodistas e investigadores
