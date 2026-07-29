/**
 * REQ-008 Fase 2 (Slice 2c) · Horario teórico y horas extra — **puro**.
 *
 * Simplificación honesta: se guarda la jornada teórica **semanal** (como se contrata: 40 h/semana) y la
 * diaria se deriva repartiéndola entre los 5 días laborables (L–V). Las horas extra de un día son lo que se
 * trabajó por encima de esa teórica diaria. Sin horario definido (`null`), no se computan extras (0).
 */

const DIAS_LABORABLES = 5;

/** Jornada diaria por defecto cuando el empleado no tiene horario definido: 8 h. */
export const JORNADA_DIARIA_DEFECTO_MIN = 8 * 60;

/** Minutos teóricos por día laborable a partir de la jornada semanal (redondeados). */
export function minutosTeoricoDiario(weeklyMinutes: number): number {
  return Math.round(weeklyMinutes / DIAS_LABORABLES);
}

/** Jornada diaria teórica en minutos; si no hay horario definido, las 8 h por defecto. */
export function jornadaDiariaMin(weeklyMinutes: number | null): number {
  return weeklyMinutes != null ? minutosTeoricoDiario(weeklyMinutes) : JORNADA_DIARIA_DEFECTO_MIN;
}

/**
 * Minutos extra de un día: lo trabajado por encima de la teórica diaria. `weeklyMinutes = null` (sin horario)
 * → 0. Nunca negativo: trabajar de menos no resta (eso es una incidencia distinta, no "horas extra").
 */
export function minutosExtra(trabajados: number, weeklyMinutes: number | null): number {
  if (weeklyMinutes == null) return 0;
  return Math.max(0, trabajados - minutosTeoricoDiario(weeklyMinutes));
}
