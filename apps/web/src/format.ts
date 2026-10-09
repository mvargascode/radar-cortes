const nf = new Intl.NumberFormat('es-CL');
export const num = (n: number) => nf.format(n);

const timeFmt = new Intl.DateTimeFormat('es-CL', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago' });
const dateFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Santiago' });
const shortFmt = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'America/Santiago' });

export const hora = (iso: string) => timeFmt.format(new Date(iso));
export const fecha = (iso: string) => dateFmt.format(new Date(iso));
export const fechaHora = (iso: string) => shortFmt.format(new Date(iso));

/** "3 horas", "1 hora", "2 días y 4 horas". */
export function duracion(horas: number): string {
  if (horas < 1) return 'menos de una hora';
  if (horas < 48) return `${horas} ${horas === 1 ? 'hora' : 'horas'}`;
  const d = Math.floor(horas / 24);
  const h = horas % 24;
  return h ? `${d} días y ${h} ${h === 1 ? 'hora' : 'horas'}` : `${d} días`;
}

/** Horas transcurridas desde una fecha hasta ahora. */
export const horasDesde = (iso: string) => Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 3600_000));
