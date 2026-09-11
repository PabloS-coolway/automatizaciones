/**
 * REQ-012 · Puerto de salida del importador de fichas. Aísla la orquestación (idempotente) de la
 * persistencia, para poder probar la lógica con una implementación en memoria y llevar la real a Prisma.
 * Todas las operaciones de catálogo son **upsert por clave estable**: repetir el import no duplica.
 */

export const FICHAS_IMPORT_REPOSITORY = Symbol('FICHAS_IMPORT_REPOSITORY');

/** Campos de una ficha de empleado que escribe el importador (los que trae el Excel de Ángeles). */
export interface FichaEmpleadoData {
  fullName: string;
  dni: string | null;
  categoriaId: number | null;
  contractTypeId: number | null;
  seccionId: number | null;
  companyId: number;
  employeeCode: string;
  centerId: number | null;
  /** Fecha de alta (col E). */
  hiredAt: Date | null;
  /** Fecha de antigüedad (col I). */
  fechaAntiguedad: Date | null;
}

export interface FichasImportRepository {
  /** Sociedad por `code` (crea o actualiza el nombre). */
  upsertCompany(code: string, name: string): Promise<{ id: number }>;
  /** Zona por `name`. */
  upsertZone(name: string): Promise<{ id: number }>;
  /**
   * Centro por `name`. Si se pasa `zoneId` (no null), enlaza/actualiza su zona; `brand` solo se usa al crear
   * (dato provisional: el Excel no trae la enseña, RRHH la ajusta luego).
   */
  upsertCenter(name: string, brand: string, zoneId: number | null): Promise<{ id: number }>;
  /** Tipo de contrato por `code`. */
  upsertContractType(code: string): Promise<{ id: number }>;
  /** Sección por `code`. */
  upsertSeccion(code: string): Promise<{ id: number }>;
  /** Categoría por `name`. */
  upsertCategoria(name: string): Promise<{ id: number }>;

  /** Usuario del login por correo (con si ya tiene ficha de empleado, para no romper el 1:1). */
  findUserByEmail(email: string): Promise<{ id: number; hasEmployee: boolean } | null>;
  createUser(data: { email: string; name: string; passwordHash: string; role: string }): Promise<{ id: number }>;

  /** Empleado por su clave de negocio (empresa + código). */
  findEmployeeByBusinessKey(companyId: number, employeeCode: string): Promise<{ id: number } | null>;
  createEmployee(userId: number, data: FichaEmpleadoData): Promise<{ id: number }>;
  updateEmployee(id: number, data: FichaEmpleadoData): Promise<void>;
}
