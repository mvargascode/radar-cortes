# DEVLOG

Formato: qué hice / dónde quedé / próximo paso.

## 2026-09-29 · Sesión 1
**Hice:**
- Definí nombre, visión, roadmap y decisiones iniciales.
- Creé el repositorio con la estructura base.
- Discovery SEC: encontré el endpoint JSON `ClientesAfectados/GetPorFecha` (POST, sin token).
- Guardé la primera muestra (00:36): 135 comunas, 5.204 clientes, 34 comunas RM.

**Dónde quedé:**
- Ficha SEC documentada con endopoint, payload y estructura de la respuesta.
- Fuente principal confirmada como usable (preliminar).
- Detecté dos problemas de diseño: solo vienen comunas con cortes, y los nombres de comunas son inconsistentes (requieren normalización).

**Próximo paso:**
- Segunda muestra para medir la frecuencia de actualización.
- Probar GetPorFecha con horas y fechas pasadas (¿Hay historial?)
- Documentar Get, GetClientesNacional y GetHoraServer.
- Revisar las Normas de Uso de la SEC.

## 2026-10-04 · Sesión 2
**Hice:**
- Probé GetPorFecha con fechas pasadas: la SEC tiene historial por hora, al menos desde 2024.
- Guardé muestras del 2026-10-04 y del temporal del 2024-08-02.
- Detecté que la hora en curso cambia y que las horas pasadas pueden corregirse.
- Registré las decisiones D-009 (SEC como única fuente de la v0.1) y D-010 (re-consulta de horas cerradas).

**Dónde quedé:**
- Fase 0 prácticamente terminada. Enel y CGE pasan a la v0.2.

**Próximo paso:**
- Leer las Normas de Uso de la SEC (si no se alcanzó hoy).
- Diseñar el esquema de base de datos (snapshots, comunas, incidentes).
- Crear el esqueleto del monorepo.