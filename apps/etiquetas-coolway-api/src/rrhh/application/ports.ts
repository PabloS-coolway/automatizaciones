import { Prisma } from '@prisma/client';
import { RrhhRole } from '@yorga/contracts';

export const EMPLOYEE_REPOSITORY = Symbol('EMPLOYEE_REPOSITORY');

/** Una fila de empleado ya resuelta (con el correo del usuario enlazado y los nombres+ids de depto/centro). */
export interface EmployeeRow {
  id: number;
  userId: number;
  fullName: string;
  email: string;
  position: string | null;
  rrhhRole: RrhhRole;
  managerId: number | null;
  active: boolean;
  department: string | null;
  departmentId: number | null;
  center: string | null;
  centerId: number | null;
  brand: string | null;
  /** Jornada teórica semanal en minutos (para horas extra); `null` = sin horario definido. */
  weeklyMinutes: number | null;
  /** Días de vacaciones que devenga al año (para el saldo); `null` = sin cupo definido. */
  annualLeaveDays: number | null;
  /** Fecha de nacimiento (YYYY-MM-DD) para cumpleaños; `null` si no consta. */
  birthDate: string | null;
  /** Privacidad: el empleado no quiere que su cumpleaños se muestre al equipo. */
  hideBirthday: boolean;
}

export interface NuevoEmpleado {
  userId: number;
  fullName: string;
  rrhhRole: RrhhRole;
  position?: string;
  managerId?: number;
  centerId?: number;
  departmentId?: number;
  weeklyMinutes?: number | null;
  annualLeaveDays?: number | null;
  birthDate?: string | null;
  hideBirthday?: boolean;
}

/** Cambios sobre una ficha (edición / baja / reactivación). Sólo los campos presentes se tocan. */
export interface EmpleadoUpdate {
  fullName?: string;
  position?: string | null;
  rrhhRole?: RrhhRole;
  managerId?: number | null;
  centerId?: number | null;
  departmentId?: number | null;
  weeklyMinutes?: number | null;
  annualLeaveDays?: number | null;
  birthDate?: string | null;
  hideBirthday?: boolean;
  active?: boolean;
}

/** Puerto: plantilla (Postgres). El enlace de identidad se resuelve por `userId` (1:1 con el login). */
export interface EmployeeRepository {
  findByUserId(userId: number): Promise<EmployeeRow | null>;
  findById(id: number): Promise<EmployeeRow | null>;
  /** Toda la plantilla — para listar y para calcular la visibilidad jerárquica. */
  findAll(): Promise<EmployeeRow[]>;
  /** Identidad compartida: id del usuario del login con ese correo (o null si no existe). */
  findUserIdByEmail(email: string): Promise<number | null>;
  create(nuevo: NuevoEmpleado, tx?: Prisma.TransactionClient): Promise<EmployeeRow>;
  update(id: number, data: EmpleadoUpdate, tx?: Prisma.TransactionClient): Promise<EmployeeRow>;
}

export const TIME_ENTRY_REPOSITORY = Symbol('TIME_ENTRY_REPOSITORY');

/** Un fichaje ya persistido. `at` es la hora del servidor. */
export interface TimeEntryRow {
  id: number;
  employeeId: number;
  kind: string;
  at: Date;
  source: string;
  note: string | null;
  /** Quién lo insertó (correo) si fue una corrección de RRHH; `null` si es fichaje propio en vivo. */
  actorEmail: string | null;
  /** Si anula/corrige otro fichaje, su id. */
  correctsId: number | null;
  /** Geolocalización del fichaje (si se dio consentimiento). `accuracy` = radio de precisión en metros. */
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
}

/** Alta de un fichaje (propio en vivo o corrección de RRHH). */
export interface NuevoFichaje {
  employeeId: number;
  kind: string;
  source: string;
  note?: string;
  at?: Date;
  actorEmail?: string;
  correctsId?: number;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
}

/** Puerto: fichajes (registro solo-añadir). No hay update ni delete: una corrección es un asiento nuevo. */
export interface TimeEntryRepository {
  /** Registra un fichaje. La hora la pone la BD (`at @default(now())`) salvo que se pase `at` (correcciones). */
  add(entry: NuevoFichaje, tx?: Prisma.TransactionClient): Promise<TimeEntryRow>;
  findById(id: number): Promise<TimeEntryRow | null>;
  /** Fichajes de un empleado en un rango `[desde, hasta)`, ordenados por hora. */
  listBetween(employeeId: number, desde: Date, hasta: Date): Promise<TimeEntryRow[]>;
  /** Fichajes de varios empleados en un rango `[desde, hasta)` (para el cuadro de mando), ordenados por hora. */
  listBetweenMany(employeeIds: number[], desde: Date, hasta: Date): Promise<TimeEntryRow[]>;
}

export const ABSENCE_TYPE_REPOSITORY = Symbol('ABSENCE_TYPE_REPOSITORY');
export const ABSENCE_REPOSITORY = Symbol('ABSENCE_REPOSITORY');

export interface AbsenceTypeRow {
  id: number;
  name: string;
  computesBalance: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  active: boolean;
  /** Nº de ausencias que usan este tipo (para avisar antes de borrar). */
  usos: number;
}

export interface AbsenceRow {
  id: number;
  employeeId: number;
  employeeName: string;
  department: string | null;
  typeId: number;
  typeName: string;
  /** ¿El tipo descuenta del saldo de vacaciones? (viene resuelto para no re-consultar). */
  computesBalance: boolean;
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
  reason: string | null;
  status: string;
  decidedByEmail: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  attachmentKey: string | null;
  attachmentName: string | null;
  createdAt: Date;
}

export interface NuevaAusencia {
  employeeId: number;
  typeId: number;
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
  reason?: string;
  status: string;
}

/** Puerto: catálogo de tipos de ausencia (configurable por RRHH). */
export interface AbsenceTypeRepository {
  list(soloActivos?: boolean): Promise<AbsenceTypeRow[]>;
  findById(id: number): Promise<AbsenceTypeRow | null>;
  create(data: { name: string; computesBalance: boolean; requiresApproval: boolean; requiresAttachment: boolean }): Promise<AbsenceTypeRow>;
  update(id: number, data: Partial<{ name: string; computesBalance: boolean; requiresApproval: boolean; requiresAttachment: boolean; active: boolean }>): Promise<AbsenceTypeRow>;
  delete(id: number): Promise<void>;
}

/** Puerto: solicitudes de ausencia. */
export interface AbsenceRepository {
  create(nueva: NuevaAusencia, tx?: Prisma.TransactionClient): Promise<AbsenceRow>;
  findById(id: number): Promise<AbsenceRow | null>;
  decidir(id: number, data: { status: string; decidedByEmail: string; decidedAt: Date; decisionNote?: string }, tx?: Prisma.TransactionClient): Promise<AbsenceRow>;
  listByEmployee(employeeId: number): Promise<AbsenceRow[]>;
  /** Ausencias en un estado dado de varios empleados (p.ej. PENDING para el aprobador). */
  listByStatusForEmployees(employeeIds: number[], status: string): Promise<AbsenceRow[]>;
  /** Ausencias aprobadas de un empleado (para comprobar solapes). */
  listApprovedByEmployee(employeeId: number): Promise<AbsenceRow[]>;
  /** Ausencias de varios empleados que tocan `[desde, hasta]`, en los estados dados (calendario/coordinación). */
  listForEmployeesBetween(employeeIds: number[], desde: Date, hasta: Date, statuses: string[]): Promise<AbsenceRow[]>;
  /** Guarda la referencia del justificante (clave de almacenamiento + nombre original). */
  setAttachment(id: number, key: string, name: string): Promise<AbsenceRow>;
}

export const NOTIFICATION_REPOSITORY = Symbol('NOTIFICATION_REPOSITORY');

export interface NotificationRow {
  id: number;
  employeeId: number;
  message: string;
  link: string | null;
  read: boolean;
  createdAt: Date;
}

/** Puerto: avisos in-app. `create` acepta tx para nacer junto al evento que lo dispara. */
export interface NotificationRepository {
  create(data: { employeeId: number; message: string; link?: string }, tx?: Prisma.TransactionClient): Promise<NotificationRow>;
  listForEmployee(employeeId: number, limit: number): Promise<NotificationRow[]>;
  countUnread(employeeId: number): Promise<number>;
  markRead(id: number, employeeId: number): Promise<void>;
  markAllRead(employeeId: number): Promise<void>;
}

export const RRHH_STRUCTURE_REPOSITORY = Symbol('RRHH_STRUCTURE_REPOSITORY');

/** Un centro/tienda con la cuenta de empleados asignados (para avisar antes de borrar). */
export interface CenterRow {
  id: number;
  name: string;
  brand: string;
  employees: number;
}

/** Un departamento con su cuenta de empleados. */
export interface DepartmentRow {
  id: number;
  name: string;
  employees: number;
}

/**
 * Puerto: estructura organizativa (centros y departamentos). Segmentan el organigrama: el centro aporta la
 * **marca** (multimarca). El borrado se bloquea si hay empleados asignados (no se deja huérfano el organigrama).
 */
export interface StructureRepository {
  listCenters(): Promise<CenterRow[]>;
  createCenter(data: { name: string; brand: string }, tx?: Prisma.TransactionClient): Promise<CenterRow>;
  updateCenter(id: number, data: { name?: string; brand?: string }, tx?: Prisma.TransactionClient): Promise<CenterRow>;
  deleteCenter(id: number, tx?: Prisma.TransactionClient): Promise<void>;
  findCenter(id: number): Promise<CenterRow | null>;

  listDepartments(): Promise<DepartmentRow[]>;
  createDepartment(data: { name: string }, tx?: Prisma.TransactionClient): Promise<DepartmentRow>;
  updateDepartment(id: number, data: { name?: string }, tx?: Prisma.TransactionClient): Promise<DepartmentRow>;
  deleteDepartment(id: number, tx?: Prisma.TransactionClient): Promise<void>;
  findDepartment(id: number): Promise<DepartmentRow | null>;
}
