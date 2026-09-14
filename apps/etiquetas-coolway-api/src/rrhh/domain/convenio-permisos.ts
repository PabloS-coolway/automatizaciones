/**
 * REQ-012 · Regla PURA de resolución de permisos por convenio. Núcleo del "superimportante" de Ángeles:
 * zona → convenio → permisos. Se aísla del acceso a datos para poder probarla sola.
 *
 * La regla, y su porqué:
 *  - Si el convenio concede permisos (≥1 fila en `hr_convenio_permiso`) → esos son los permisos del trabajador,
 *    con los parámetros del convenio (días máx, remunerado).
 *  - Si el convenio NO concede ninguno (aún sin rellenar, o el empleado no tiene convenio) → se usa el catálogo
 *    global de tipos de ausencia (REQ-008). Así, MIENTRAS Ángeles no rellene los convenios, todo sigue
 *    funcionando exactamente como hoy (cero rework, cero regresión).
 */

export interface AbsenceTypeInput {
  id: number;
  name: string;
  computesBalance: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
}

export interface ConvenioPermisoInput {
  absenceType: AbsenceTypeInput;
  diasMax: number | null;
  remunerado: boolean | null;
}

export type FuentePermisos = 'convenio' | 'global';

export interface PermisoResuelto {
  absenceTypeId: number;
  name: string;
  computesBalance: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  diasMax: number | null;
  remunerado: boolean | null;
}

/**
 * Resuelve los permisos efectivos a partir de lo que concede el convenio y del catálogo global.
 * `convenioPermisos` vacío (o el empleado sin convenio, que llega igual como lista vacía) ⇒ fallback global.
 */
export function resolverPermisos(
  convenioPermisos: ConvenioPermisoInput[],
  catalogoGlobal: AbsenceTypeInput[],
): { fuente: FuentePermisos; permisos: PermisoResuelto[] } {
  if (convenioPermisos.length > 0) {
    return {
      fuente: 'convenio',
      permisos: convenioPermisos.map((cp) => ({
        absenceTypeId: cp.absenceType.id,
        name: cp.absenceType.name,
        computesBalance: cp.absenceType.computesBalance,
        requiresApproval: cp.absenceType.requiresApproval,
        requiresAttachment: cp.absenceType.requiresAttachment,
        diasMax: cp.diasMax,
        remunerado: cp.remunerado,
      })),
    };
  }

  return {
    fuente: 'global',
    permisos: catalogoGlobal.map((at) => ({
      absenceTypeId: at.id,
      name: at.name,
      computesBalance: at.computesBalance,
      requiresApproval: at.requiresApproval,
      requiresAttachment: at.requiresAttachment,
      diasMax: null,
      remunerado: null,
    })),
  };
}
