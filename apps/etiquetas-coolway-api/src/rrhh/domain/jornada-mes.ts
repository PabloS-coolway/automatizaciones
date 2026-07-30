/**
 * REQ-008 · Resumen MENSUAL de jornada — **puro**. Para cada día del mes decide su estado combinando fichajes,
 * festivos, ausencias aprobadas y si es laborable. Sirve para una vista que escale (un mes cada vez) y para
 * marcar los días laborables pasados en los que **falta fichar** (el olvido silencioso que hay que cazar).
 */

export const ESTADOS_DIA = ['OK', 'INCOMPLETO', 'FALTA', 'FESTIVO', 'FIN_SEMANA', 'AUSENCIA', 'HOY', 'FUTURO', 'PREVIO'] as const;
export type EstadoDia = (typeof ESTADOS_DIA)[number];

export interface DiaResumen {
  fecha: string; // YYYY-MM-DD
  estado: EstadoDia;
  minutosTrabajados: number;
  minutosExtra: number;
  /** Nombre del festivo o tipo de ausencia, si aplica; `null` si no. */
  etiqueta: string | null;
}

export interface TrabajoDia {
  minutos: number;
  extra: number;
  /** La jornada quedó sin cerrar (entró y no salió). */
  abierta: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m1: number, d: number) => `${y}-${pad(m1)}-${pad(d)}`;

/**
 * Estado de cada día de `year`/`month` (mes 1-12) hasta el final del mes.
 * Prioridad: si hay fichajes, mandan (OK/INCOMPLETO); si no, se explica el hueco (ausencia, festivo, finde) o
 * se marca FALTA en un día laborable pasado. Hoy nunca es FALTA (la jornada aún no acabó); el futuro se ignora.
 */
export function resumenMensual(args: {
  year: number;
  month: number; // 1-12
  hoyISO: string;
  trabajado: Map<string, TrabajoDia>;
  festivos: Map<string, string>;
  ausencias: Map<string, string>;
  /** Desde qué día se exige fichar; antes de esta fecha no hay FALTA (estado PREVIO). `null` = desde siempre. */
  fichajeDesdeISO?: string | null;
}): DiaResumen[] {
  const { year, month, hoyISO, trabajado, festivos, ausencias, fichajeDesdeISO } = args;
  const diasEnMes = new Date(year, month, 0).getDate();
  const out: DiaResumen[] = [];

  for (let d = 1; d <= diasEnMes; d++) {
    const fecha = iso(year, month, d);
    const t = trabajado.get(fecha);
    const min = t?.minutos ?? 0;
    const extra = t?.extra ?? 0;
    const finde = [0, 6].includes(new Date(year, month - 1, d).getDay());

    let estado: EstadoDia;
    let etiqueta: string | null = null;

    if (fecha > hoyISO) {
      estado = 'FUTURO';
    } else if (fecha === hoyISO) {
      estado = 'HOY';
    } else if (t) {
      // Día pasado con fichajes: OK salvo que quedara sin cerrar. Los fichajes mandan (aunque sea previo).
      estado = t.abierta ? 'INCOMPLETO' : 'OK';
    } else if (fichajeDesdeISO && fecha < fichajeDesdeISO) {
      // Antes de que se le exigiera fichar: ni falta ni nada, no existía/no fichaba.
      estado = 'PREVIO';
    } else if (ausencias.has(fecha)) {
      estado = 'AUSENCIA';
      etiqueta = ausencias.get(fecha) ?? null;
    } else if (festivos.has(fecha)) {
      estado = 'FESTIVO';
      etiqueta = festivos.get(fecha) ?? null;
    } else if (finde) {
      estado = 'FIN_SEMANA';
    } else {
      // Día laborable pasado, sin fichajes y sin justificación → FALTA fichar.
      estado = 'FALTA';
    }

    out.push({ fecha, estado, minutosTrabajados: min, minutosExtra: extra, etiqueta });
  }
  return out;
}
