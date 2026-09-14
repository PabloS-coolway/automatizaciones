import { AbsenceTypeInput, ConvenioPermisoInput } from '../domain/convenio-permisos';

/**
 * REQ-012 · Puerto de salida del resolver de permisos por convenio. Aísla la lógica (probada en memoria) de las
 * consultas Prisma. La cadena empleado → centro → zona → convenio se resuelve en el repositorio.
 */
export const CONVENIO_PERMISOS_REPOSITORY = Symbol('CONVENIO_PERMISOS_REPOSITORY');

export interface EmpleadoConvenioChain {
  employeeId: number;
  zona: { id: number; name: string } | null;
  convenio: { id: number; name: string } | null;
}

export interface ConvenioPermisosRepository {
  /** Cadena empleado → centro → zona → convenio. `null` si el empleado no existe. */
  findEmployeeChain(employeeId: number): Promise<EmpleadoConvenioChain | null>;
  /** Permisos que concede un convenio (join con el tipo de ausencia y sus parámetros). */
  listConvenioPermisos(convenioId: number): Promise<ConvenioPermisoInput[]>;
  /** Catálogo global de tipos de ausencia ACTIVOS (fallback cuando el convenio no concede permisos). */
  listGlobalAbsenceTypes(): Promise<AbsenceTypeInput[]>;
}
