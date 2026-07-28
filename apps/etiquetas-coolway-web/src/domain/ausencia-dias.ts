/**
 * REQ-008 · Cálculo de días de una ausencia — puro, en cliente, para el **resumen** de la solicitud
 * (inspirado en el "Absence summary" de Factorial). Espeja la regla del backend
 * (`diasSolicitados`): días naturales inclusive; medio día = 0,5 sólo si es un único día.
 */

const MS_DIA = 86_400_000;

/** 'YYYY-MM-DD' → medianoche UTC (número), para contar días sin líos de zona horaria. */
function diaUTC(iso: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** ¿El rango es de un único día? (mismas fechas y ambas válidas). */
export function esUnSoloDia(startDate: string, endDate: string): boolean {
  const a = diaUTC(startDate);
  const b = diaUTC(endDate);
  return a != null && a === b;
}

/**
 * Días solicitados de un rango (inclusive). `null` si las fechas aún no son válidas o el inicio es posterior
 * al fin (para no mostrar un resumen que engañe). Medio día = 0,5 sólo en un único día.
 */
export function diasSolicitados(startDate: string, endDate: string, halfDay: boolean): number | null {
  const a = diaUTC(startDate);
  const b = diaUTC(endDate);
  if (a == null || b == null || a > b) return null;
  const dias = Math.round((b - a) / MS_DIA) + 1;
  return halfDay && dias === 1 ? 0.5 : dias;
}
