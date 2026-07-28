/**
 * REQ-008 Fase 3 · Ausencias — reglas **puras** (estados, solape, días solicitados).
 *
 * La regla que no se negocia: **dos ausencias aprobadas del mismo empleado no pueden solaparse** (si no, el
 * saldo y el calendario mentirían). Vive aislada y testeada, sin BD.
 */

export const ESTADOS_AUSENCIA = ['PENDING', 'APPROVED', 'REJECTED'] as const;
export type EstadoAusencia = (typeof ESTADOS_AUSENCIA)[number];

export function esEstadoAusencia(x: string): x is EstadoAusencia {
  return (ESTADOS_AUSENCIA as readonly string[]).includes(x);
}

/** Un rango de fechas (día completo, sin hora). */
export interface Rango {
  start: Date;
  end: Date;
}

const MS_DIA = 86_400_000;

/** Fecha a medianoche UTC (sólo la parte de día), para contar y comparar días sin líos de hora. */
function soloDia(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** ¿El rango es válido? (inicio no posterior al fin). */
export function rangoValido(r: Rango): boolean {
  return soloDia(r.start) <= soloDia(r.end);
}

/** ¿Se solapan dos rangos de días (inclusive)? */
export function solapa(a: Rango, b: Rango): boolean {
  return soloDia(a.start) <= soloDia(b.end) && soloDia(b.start) <= soloDia(a.end);
}

/** ¿La nueva ausencia solapa con alguna de las existentes (p.ej. las ya aprobadas)? */
export function haySolape(nueva: Rango, existentes: Rango[]): boolean {
  return existentes.some((e) => solapa(nueva, e));
}

/** Días solicitados: nº de días del rango (inclusive); si es medio día en una sola jornada, 0,5. */
export function diasSolicitados(r: Rango, halfDay: boolean): number {
  const dias = Math.round((soloDia(r.end) - soloDia(r.start)) / MS_DIA) + 1;
  return halfDay && dias === 1 ? 0.5 : dias;
}

/** Claves de día (YYYY-MM-DD, UTC) de todo el rango, inclusive. Para el calendario y la coordinación. */
export function diasDeRango(r: Rango): string[] {
  const out: string[] = [];
  for (let t = soloDia(r.start); t <= soloDia(r.end); t += MS_DIA) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** Saldo de vacaciones: lo que devenga al año menos lo ya disfrutado (aprobado). `pendientes` es informativo. */
export interface Saldo {
  anual: number;
  disfrutados: number;
  pendientes: number;
  restante: number;
}

export function saldoVacaciones(anual: number, disfrutados: number, pendientes: number): Saldo {
  return { anual, disfrutados, pendientes, restante: Math.round((anual - disfrutados) * 10) / 10 };
}
