# DEVLOG

Formato: qué hice / dónde quedé / próximo paso.

## 2026-09-29 · Sesión 1
**Hice:**
- Definí nombre, visión, roadmap y decisiones iniciales.
- Creé el repositorio con la estructura base.
- Discovery SEC: encontré el endpoint JSON `ClientesAfectado/GetPorFecha` (POST, sin token).
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
