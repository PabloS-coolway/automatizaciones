/** REQ-008 · Módulo RRHH (Fase 0/1). Contratos API↔web. */

export const RRHH_ROLES = ['EMPLEADO', 'MANAGER', 'RRHH', 'ADMIN'] as const;
export type RrhhRole = (typeof RRHH_ROLES)[number];

/** Cómo se lee cada rol RRHH en la interfaz. */
export const RRHH_ROLE_LABELS: Record<RrhhRole, string> = {
  EMPLEADO: 'Empleado',
  MANAGER: 'Responsable',
  RRHH: 'RRHH',
  ADMIN: 'Administrador',
};

/** Un empleado tal como lo ve la web. `email` es la identidad compartida con el login. */
export interface EmployeeDto {
  id: number;
  fullName: string;
  email: string;
  position: string | null;
  rrhhRole: RrhhRole;
  managerId: number | null;
  active: boolean;
  /** Nombres resueltos (para pintar) + ids (para editar). El centro aporta la marca del organigrama. */
  department: string | null;
  departmentId: number | null;
  center: string | null;
  centerId: number | null;
  brand: string | null;
}

/**
 * Alta de empleado (la hace RRHH). Se enlaza con un **usuario que ya existe** por su `email` — el módulo
 * RRHH no crea logins. `managerId` sostiene el organigrama; `centerId` lo segmenta por marca.
 */
export interface CreateEmployeeDto {
  email: string;
  fullName: string;
  rrhhRole?: RrhhRole;
  position?: string;
  managerId?: number;
  centerId?: number;
  departmentId?: number;
}

/** Edición de una ficha (Fase 1). Todo opcional; sólo lo presente se cambia. El correo/usuario no se cambia. */
export interface UpdateEmployeeDto {
  fullName?: string;
  position?: string | null;
  rrhhRole?: RrhhRole;
  managerId?: number | null;
  centerId?: number | null;
  departmentId?: number | null;
}

/** Un centro/tienda del grupo. La `brand` (enseña) es la que **segmenta el organigrama** (multimarca). */
export interface CenterDto {
  id: number;
  name: string;
  brand: string;
  /** Nº de empleados asignados — para avisar antes de borrar y para la vista de estructura. */
  employees: number;
}

export interface CreateCenterDto {
  name: string;
  brand: string;
}

export type UpdateCenterDto = Partial<CreateCenterDto>;

/** Un departamento (transversal a las marcas). */
export interface DepartmentDto {
  id: number;
  name: string;
  employees: number;
}

export interface CreateDepartmentDto {
  name: string;
}

export type UpdateDepartmentDto = Partial<CreateDepartmentDto>;

/** Contexto RRHH del usuario que ha entrado (para que la web sepa qué mostrar). `null` = no es empleado. */
export interface RrhhMeDto {
  employee: EmployeeDto | null;
}
