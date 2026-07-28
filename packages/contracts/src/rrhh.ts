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
  /** Jornada teórica semanal en minutos (para horas extra); `null` = sin horario definido. */
  weeklyMinutes: number | null;
  /** Días de vacaciones que devenga al año (para el saldo); `null` = sin cupo. */
  annualLeaveDays: number | null;
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
  weeklyMinutes?: number | null;
  annualLeaveDays?: number | null;
}

/** Edición de una ficha (Fase 1). Todo opcional; sólo lo presente se cambia. El correo/usuario no se cambia. */
export interface UpdateEmployeeDto {
  fullName?: string;
  position?: string | null;
  rrhhRole?: RrhhRole;
  managerId?: number | null;
  centerId?: number | null;
  departmentId?: number | null;
  weeklyMinutes?: number | null;
  annualLeaveDays?: number | null;
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

/** Un usuario del login que aún NO tiene ficha de empleado (candidato a dar de alta en RRHH). */
export interface UsuarioSinFichaDto {
  id: number;
  email: string;
  name: string;
}

/**
 * Un empleado en el **organigrama público**: lo visible para toda la plantilla (nombre, puesto, rol, centro,
 * marca y su responsable). SIN datos sensibles (correo, jornada, saldo, fichajes). Es un subconjunto de
 * `EmployeeDto`, así que sirve para la misma vista de organigrama.
 */
export interface OrgEmployeeDto {
  id: number;
  fullName: string;
  position: string | null;
  rrhhRole: RrhhRole;
  managerId: number | null;
  active: boolean;
  center: string | null;
  brand: string | null;
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

/** Un día del histórico personal: minutos trabajados, horas extra y sus marcajes. */
export interface DiaJornadaDto {
  fecha: string;
  minutosTrabajados: number;
  /** Minutos por encima de la jornada teórica diaria (0 si no hay horario o no hay exceso). */
  minutosExtra: number;
  fichajes: TimeEntryDto[];
}

/** Histórico personal de fichajes en un rango, con totales. */
export interface HistoricoFichajeDto {
  desde: string;
  hasta: string;
  dias: DiaJornadaDto[];
  totalMinutos: number;
  totalExtra: number;
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

// ---- REQ-008 Fase 3 · Ausencias y vacaciones ----

export const ESTADOS_AUSENCIA = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type EstadoAusencia = (typeof ESTADOS_AUSENCIA)[number];

export const ESTADO_AUSENCIA_LABELS: Record<EstadoAusencia, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};

/** Un tipo de ausencia del catálogo (configurable por RRHH). */
export interface AbsenceTypeDto {
  id: number;
  name: string;
  computesBalance: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  active: boolean;
  usos: number;
}

export interface CreateAbsenceTypeDto {
  name: string;
  computesBalance?: boolean;
  requiresApproval?: boolean;
  requiresAttachment?: boolean;
}

export type UpdateAbsenceTypeDto = Partial<CreateAbsenceTypeDto> & { active?: boolean };

/** Una solicitud de ausencia. `startDate`/`endDate` en YYYY-MM-DD. */
export interface AbsenceDto {
  id: number;
  employeeId: number;
  employeeName: string;
  /** Departamento del empleado (para filtrar el calendario). `null` si no tiene. */
  department: string | null;
  typeId: number;
  typeName: string;
  startDate: string;
  endDate: string;
  halfDay: boolean;
  dias: number;
  reason: string | null;
  status: EstadoAusencia;
  decidedByEmail: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  /** Nombre del justificante adjunto, o `null` si no hay. Se descarga por la API (dato sensible). */
  attachmentName: string | null;
  createdAt: string;
}

export interface SolicitarAusenciaDto {
  typeId: number;
  startDate: string;
  endDate: string;
  halfDay?: boolean;
  reason?: string;
}

export interface DecidirAusenciaDto {
  note?: string;
}

/** Saldo de vacaciones de un empleado en un año. */
export interface SaldoVacacionesDto {
  year: number;
  anual: number;
  disfrutados: number;
  pendientes: number;
  restante: number;
}

/** Calendario de ausencias del equipo en un rango (para ver solapes antes de aprobar). */
export interface CalendarioAusenciasDto {
  desde: string;
  hasta: string;
  ausencias: AbsenceDto[];
}

// ---- REQ-008 · Panel de actividad RRHH (auditoría, solo lectura) ----

export const RRHH_ACTIVITY_ENTITIES = ['EMPLEADO', 'CENTRO', 'DEPARTAMENTO', 'FICHAJE', 'AUSENCIA', 'TIPO_AUSENCIA'] as const;
export type RrhhActivityEntity = (typeof RRHH_ACTIVITY_ENTITIES)[number];

export const RRHH_ACTIVITY_ENTITY_LABELS: Record<RrhhActivityEntity, string> = {
  EMPLEADO: 'Empleado',
  CENTRO: 'Centro',
  DEPARTAMENTO: 'Departamento',
  FICHAJE: 'Fichaje',
  AUSENCIA: 'Ausencia',
  TIPO_AUSENCIA: 'Tipo de ausencia',
};

export const RRHH_ACTIVITY_ACTION_LABELS: Record<string, string> = {
  CREATE: 'Alta',
  UPDATE: 'Cambio',
  DELETE: 'Baja',
};

/** Una entrada del log de actividad de RRHH (quién, cuándo, qué). */
export interface RrhhActivityDto {
  id: number;
  createdAt: string;
  actorEmail: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: RrhhActivityEntity;
  entityId: string;
  summary: string;
}

/** Página del log de actividad de RRHH. */
export interface RrhhActivityListDto {
  entries: RrhhActivityDto[];
  total: number;
}

// ---- REQ-008 Fase 4 · Avisos in-app ----

export interface NotificacionDto {
  id: number;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}
