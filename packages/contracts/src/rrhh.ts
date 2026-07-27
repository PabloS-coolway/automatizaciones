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

// ---- REQ-008 Fase 2 · Fichajes ----

export const MARCAJES = ['IN', 'OUT', 'BREAK_START', 'BREAK_END'] as const;
export type Marcaje = (typeof MARCAJES)[number];

export const MARCAJE_LABELS: Record<Marcaje, string> = {
  IN: 'Entrar',
  OUT: 'Salir',
  BREAK_START: 'Iniciar pausa',
  BREAK_END: 'Volver de pausa',
};

export const ESTADOS_JORNADA = ['FUERA', 'TRABAJANDO', 'EN_PAUSA'] as const;
export type EstadoJornada = (typeof ESTADOS_JORNADA)[number];

export const ESTADO_JORNADA_LABELS: Record<EstadoJornada, string> = {
  FUERA: 'Fuera de jornada',
  TRABAJANDO: 'Trabajando',
  EN_PAUSA: 'En pausa',
};

/** Un fichaje ya registrado. `at` es ISO-8601 (hora del servidor). */
export interface TimeEntryDto {
  id: number;
  kind: Marcaje;
  at: string;
  source: string;
  note: string | null;
}

/** Petición de fichaje. La hora la pone el servidor; el cliente sólo dice qué marca y desde dónde. */
export interface FicharDto {
  kind: Marcaje;
  source?: 'WEB' | 'MOBILE';
}

/** "Mi jornada de hoy": estado actual, marcajes posibles, fichajes del día y minutos trabajados. */
export interface JornadaHoyDto {
  fecha: string;
  estado: EstadoJornada;
  posibles: Marcaje[];
  minutosTrabajados: number;
  fichajes: TimeEntryDto[];
}

/** Un empleado fichado ahora mismo (cuadro de mando). */
export interface FichandoAhoraDto {
  employeeId: number;
  fullName: string;
  estado: EstadoJornada;
  minutosTrabajados: number;
}

/** Una jornada de un día anterior que quedó SIN CERRAR (incidencia a revisar). */
export interface IncidenciaFichajeDto {
  employeeId: number;
  fullName: string;
  fecha: string;
}

/** Cuadro de mando de fichajes, acotado a los empleados que el usuario puede ver (su rama del organigrama). */
export interface PanelFichajeDto {
  ahora: FichandoAhoraDto[];
  incidencias: IncidenciaFichajeDto[];
}

/** Un día del histórico personal: minutos trabajados y sus marcajes. */
export interface DiaJornadaDto {
  fecha: string;
  minutosTrabajados: number;
  fichajes: TimeEntryDto[];
}

/** Histórico personal de fichajes en un rango. */
export interface HistoricoFichajeDto {
  desde: string;
  hasta: string;
  dias: DiaJornadaDto[];
}

/** Un marcaje en la vista de revisión/corrección: incluye quién lo puso y si está anulado. */
export interface EntradaFichajeDto {
  id: number;
  kind: string; // IN | OUT | BREAK_START | BREAK_END | VOID
  at: string;
  source: string;
  note: string | null;
  /** Correo de quien lo insertó si fue una corrección de RRHH; `null` si es fichaje propio del empleado. */
  actorEmail: string | null;
  /** ¿Anulado por una corrección posterior? (se pinta tachado, pero no se borra). */
  anulado: boolean;
}

/** Detalle de un día de un empleado, para que RRHH lo revise y corrija. */
export interface DiaDetalleFichajeDto {
  fecha: string;
  minutosTrabajados: number;
  entradas: EntradaFichajeDto[];
}

/**
 * Corrección de un fichaje (solo RRHH). `ADD` inserta un marcaje que faltó (con `kind` y `at`); `VOID` anula
 * uno erróneo (con `targetId`). Append-only: nunca edita ni borra el original.
 */
export interface CorreccionFichajeDto {
  action: 'ADD' | 'VOID';
  kind?: Marcaje;
  at?: string;
  targetId?: number;
  note?: string;
}
