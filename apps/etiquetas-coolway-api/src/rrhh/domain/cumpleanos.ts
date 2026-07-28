/**
 * REQ-008 · Próximos cumpleaños — puro. Dado un conjunto de empleados con fecha de nacimiento, calcula los que
 * cumplen en los próximos `dias` días (incluido hoy), ordenados por cercanía. No inventa: si no hay fecha, no
 * entra.
 */

export interface EmpleadoConCumple {
  id: number;
  fullName: string;
  birthDate: Date | null;
}

export interface Cumple {
  id: number;
  fullName: string;
  /** Día del cumpleaños este año/próximo, en MM-DD. */
  fecha: string;
  /** Días desde hoy hasta el cumpleaños (0 = hoy). */
  diasHasta: number;
  /** Edad que cumple (si se puede calcular). */
  edad: number;
}

const MS_DIA = 86_400_000;

/** Fecha (sólo día) a UTC-midnight para comparar sin líos de hora. */
function soloDia(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** Próximo cumpleaños dentro de `dias` a partir de `hoy` (incluido). Ordenados por cercanía y luego por nombre. */
export function proximosCumpleanos(empleados: EmpleadoConCumple[], hoy: Date, dias: number): Cumple[] {
  const hoyMs = soloDia(hoy);
  const anioHoy = new Date(hoyMs).getUTCFullYear();
  const out: Cumple[] = [];

  for (const e of empleados) {
    if (!e.birthDate) continue;
    const mes = e.birthDate.getUTCMonth();
    const dia = e.birthDate.getUTCDate();
    // El cumpleaños de este año; si ya pasó, el del año que viene.
    let prox = Date.UTC(anioHoy, mes, dia);
    if (prox < hoyMs) prox = Date.UTC(anioHoy + 1, mes, dia);
    const diasHasta = Math.round((prox - hoyMs) / MS_DIA);
    if (diasHasta > dias) continue;
    const edad = new Date(prox).getUTCFullYear() - e.birthDate.getUTCFullYear();
    out.push({
      id: e.id,
      fullName: e.fullName,
      fecha: `${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`,
      diasHasta,
      edad,
    });
  }

  return out.sort((a, b) => a.diasHasta - b.diasHasta || a.fullName.localeCompare(b.fullName));
}
