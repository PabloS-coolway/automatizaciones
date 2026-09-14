/**
 * REQ-012 · DTOs de los permisos EFECTIVOS de un empleado, resueltos por su convenio (vía zona del centro).
 * Regla de negocio: el convenio determina el subconjunto de permisos y sus parámetros; si el convenio no
 * concede ninguno (o el empleado no tiene convenio asignado), se cae al catálogo global de tipos de ausencia
 * (compatibilidad hacia atrás con REQ-008). El campo `fuente` dice de dónde salió cada resultado.
 */

export interface PermisoResueltoDto {
  absenceTypeId: number;
  name: string;
  computesBalance: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  /** Días máximos que concede el convenio para este permiso. `null` si viene del catálogo global o el convenio no lo fija. */
  diasMax: number | null;
  /** Si el permiso es remunerado según el convenio. `null` si viene del catálogo global o el convenio no lo fija. */
  remunerado: boolean | null;
}

export interface EmpleadoPermisosDto {
  employeeId: number;
  /** Zona del centro del empleado (de donde se deriva el convenio). `null` si su centro no tiene zona. */
  zona: { id: number; name: string } | null;
  /** Convenio aplicable (por la zona). `null` si la zona no tiene convenio o el empleado no tiene centro/zona. */
  convenio: { id: number; name: string } | null;
  /** 'convenio' = el convenio concede permisos explícitos; 'global' = fallback al catálogo global. */
  fuente: 'convenio' | 'global';
  permisos: PermisoResueltoDto[];
}
