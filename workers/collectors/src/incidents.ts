/**
 * Derivación de incidentes a partir de la serie horaria de una comuna (D-014).
 *
 * Reglas:
 * - Apertura: una hora con clientes afectados >= openThreshold.
 * - Continuidad: horas bajo el umbral dentro de un incidente no lo cierran de inmediato
 *   (evita que un corte que "parpadea" alrededor del umbral se parta en muchos).
 * - Cierre: closeAfterHours horas CONSULTADAS seguidas bajo el umbral.
 * - Huecos (horas sin datos) no cuentan para cerrar (D-013), salvo que superen maxGapHours:
 *   ahí no sabemos qué pasó y el incidente se cierra en la última hora conocida sobre el umbral.
 * - Resolución horaria: ended_at = inicio de la última hora sobre el umbral + 1 hora.
 * - Estado: RESTORED si cerró; si sigue abierto, DETECTED con 1 hora sobre el umbral y ACTIVE con 2 o más.
 */

export interface HourPoint {
  /** Inicio de la hora (UTC). */
  t: Date;
  /** Clientes afectados en esa hora (0 si la hora se consultó y la comuna no aparecía). */
  value: number;
}

export interface IncidentRules {
  openThreshold: number;
  closeAfterHours: number;
  maxGapHours: number;
}

export const DEFAULT_RULES: IncidentRules = {
  openThreshold: 500,
  closeAfterHours: 2,
  maxGapHours: 6,
};

export type IncidentStatus = 'DETECTED' | 'ACTIVE' | 'RESTORED';

export interface DerivedIncident {
  status: IncidentStatus;
  startedAt: Date;
  endedAt: Date | null;
  peakClientes: number;
  peakAt: Date;
  /** Suma de clientes afectados en cada hora del incidente (clientes × horas). */
  clienteHoras: number;
  /** Horas sobre el umbral. */
  hoursAbove: number;
}

const HOUR = 3600_000;

interface Open {
  startedAt: Date;
  peakClientes: number;
  peakAt: Date;
  clienteHoras: number;
  hoursAbove: number;
  lastAbove: Date;
  belowCount: number;
  pendingClienteHoras: number;
}

/** points debe venir ordenado por tiempo y contener SOLO horas consultadas (fetched_hours). */
export function deriveIncidents(points: HourPoint[], rules: IncidentRules = DEFAULT_RULES): DerivedIncident[] {
  const out: DerivedIncident[] = [];
  let cur: Open | null = null;
  let prev: Date | null = null;

  const close = (o: Open) =>
    out.push({
      status: 'RESTORED',
      startedAt: o.startedAt,
      endedAt: new Date(o.lastAbove.getTime() + HOUR),
      peakClientes: o.peakClientes,
      peakAt: o.peakAt,
      clienteHoras: o.clienteHoras,
      hoursAbove: o.hoursAbove,
    });

  for (const p of points) {
    // Hueco largo de datos: no se puede afirmar que el corte siguió.
    if (cur && prev) {
      const missing = Math.round((p.t.getTime() - prev.getTime()) / HOUR) - 1;
      if (missing > rules.maxGapHours) {
        close(cur);
        cur = null;
      }
    }

    const above = p.value >= rules.openThreshold;
    if (!cur) {
      if (above) {
        cur = {
          startedAt: p.t,
          peakClientes: p.value,
          peakAt: p.t,
          clienteHoras: p.value,
          hoursAbove: 1,
          lastAbove: p.t,
          belowCount: 0,
          pendingClienteHoras: 0,
        };
      }
    } else if (above) {
      cur.clienteHoras += cur.pendingClienteHoras + p.value;
      cur.pendingClienteHoras = 0;
      cur.belowCount = 0;
      cur.hoursAbove++;
      cur.lastAbove = p.t;
      if (p.value > cur.peakClientes) {
        cur.peakClientes = p.value;
        cur.peakAt = p.t;
      }
    } else {
      cur.belowCount++;
      cur.pendingClienteHoras += p.value;
      if (cur.belowCount >= rules.closeAfterHours) {
        close(cur);
        cur = null;
      }
    }
    prev = p.t;
  }

  if (cur) {
    out.push({
      status: cur.hoursAbove >= 2 ? 'ACTIVE' : 'DETECTED',
      startedAt: cur.startedAt,
      endedAt: null,
      peakClientes: cur.peakClientes,
      peakAt: cur.peakAt,
      clienteHoras: cur.clienteHoras + cur.pendingClienteHoras,
      hoursAbove: cur.hoursAbove,
    });
  }
  return out;
}
