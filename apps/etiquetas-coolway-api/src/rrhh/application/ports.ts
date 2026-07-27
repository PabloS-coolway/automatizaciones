import { RrhhRole } from '@yorga/contracts';

export const EMPLOYEE_REPOSITORY = Symbol('EMPLOYEE_REPOSITORY');

/** Una fila de empleado ya resuelta (con el correo del usuario enlazado y los nombres de depto/centro). */
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
  center: string | null;
  brand: string | null;
}

export interface NuevoEmpleado {
  userId: number;
  fullName: string;
  rrhhRole: RrhhRole;
  position?: string;
  managerId?: number;
}

/** Puerto: plantilla (Postgres). El enlace de identidad se resuelve por `userId` (1:1 con el login). */
export interface EmployeeRepository {
  findByUserId(userId: number): Promise<EmployeeRow | null>;
  findById(id: number): Promise<EmployeeRow | null>;
  /** Toda la plantilla — para listar y para calcular la visibilidad jerárquica. */
  findAll(): Promise<EmployeeRow[]>;
  /** Identidad compartida: id del usuario del login con ese correo (o null si no existe). */
  findUserIdByEmail(email: string): Promise<number | null>;
  create(nuevo: NuevoEmpleado): Promise<EmployeeRow>;
}
