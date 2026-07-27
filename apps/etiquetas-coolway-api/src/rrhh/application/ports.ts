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
}

export interface NuevoEmpleado {
  userId: number;
  fullName: string;
  rrhhRole: RrhhRole;
  position?: string;
  managerId?: number;
  centerId?: number;
  departmentId?: number;
}

/** Cambios sobre una ficha (edición / baja / reactivación). Sólo los campos presentes se tocan. */
export interface EmpleadoUpdate {
  fullName?: string;
  position?: string | null;
  rrhhRole?: RrhhRole;
  managerId?: number | null;
  centerId?: number | null;
  departmentId?: number | null;
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
}

/** Puerto: fichajes (registro solo-añadir). No hay update ni delete: una corrección es un asiento nuevo. */
export interface TimeEntryRepository {
  /** Registra un fichaje. La hora la pone la BD (`at @default(now())`) salvo que se pase `at` (correcciones). */
  add(entry: { employeeId: number; kind: string; source: string; note?: string; at?: Date }): Promise<TimeEntryRow>;
  /** Fichajes de un empleado en un rango `[desde, hasta)`, ordenados por hora. */
  listBetween(employeeId: number, desde: Date, hasta: Date): Promise<TimeEntryRow[]>;
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
