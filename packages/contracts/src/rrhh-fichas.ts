/**
 * REQ-012 · Contratos de la Fase 2 de RRHH: multi-sociedad, zona/convenio, catálogos y el importador de
 * fichas de Ángeles (las 12 columnas). Los DTOs de las entidades son mínimos (lo que la web pinta); el
 * contenido de convenio→permisos se rellenará más adelante y por eso su DTO es abierto.
 */

/** Una sociedad jurídica del grupo (VANYOR SAU, YORGA SAU…). La identidad de negocio es (empresa + código). */
export interface CompanyDto {
  id: number;
  /** Nº/código de empresa que usa RRHH (16, 12, 105, 120…). */
  code: string;
  name: string;
  /** Nº de empleados asignados. */
  employees: number;
}

/** Una zona/área geográfica. `convenioId` = convenio aplicable (aún puede no estar asignado). */
export interface ZoneDto {
  id: number;
  name: string;
  convenioId: number | null;
  convenioName: string | null;
  /** Nº de centros que usan esta zona (para avisar antes de borrar). */
  centers: number;
}

/** Un convenio colectivo (estructura; el contenido de permisos lo rellena RRHH). */
export interface ConvenioDto {
  id: number;
  code: string | null;
  name: string;
  /** Nº de zonas que usan este convenio (para avisar antes de borrar). */
  zonas: number;
}

/** Una categoría profesional del catálogo (AUX.INFORM, DEPENDIENT…). */
export interface CategoriaDto {
  id: number;
  code: string | null;
  name: string;
  /** Nº de empleados con esta categoría (para avisar antes de borrar). */
  employees: number;
}

/** Un tipo/código de contrato del catálogo (100, 200, 500…). */
export interface ContractTypeDto {
  id: number;
  code: string;
  name: string | null;
  /** Nº de empleados con este tipo de contrato (para avisar antes de borrar). */
  employees: number;
}

/** Una sección del catálogo (código de sección del maestro de RRHH). */
export interface SeccionDto {
  id: number;
  code: string;
  name: string | null;
  /** Nº de empleados con esta sección (para avisar antes de borrar). */
  employees: number;
}

// ---- REQ-012 · Bloque 3 · Gestión maestra (CRUD de la capa organizativa) ----

/** Alta de una sociedad/empresa. La clave estable es `code` (único). */
export interface CreateCompanyDto {
  code: string;
  name: string;
}
export type UpdateCompanyDto = Partial<CreateCompanyDto>;

/** Alta de una zona. `convenioId` opcional (aún puede no tener convenio asignado). */
export interface CreateZoneDto {
  name: string;
  convenioId?: number | null;
}
export type UpdateZoneDto = Partial<CreateZoneDto>;

/** Alta de un convenio. `name` único; `code` opcional. */
export interface CreateConvenioDto {
  code?: string | null;
  name: string;
}
export type UpdateConvenioDto = Partial<CreateConvenioDto>;

/** Alta de una categoría profesional. `name` único; `code` opcional. */
export interface CreateCategoriaDto {
  code?: string | null;
  name: string;
}
export type UpdateCategoriaDto = Partial<CreateCategoriaDto>;

/** Alta de un tipo de contrato. `code` único; `name` opcional. */
export interface CreateContractTypeDto {
  code: string;
  name?: string | null;
}
export type UpdateContractTypeDto = Partial<CreateContractTypeDto>;

/** Alta de una sección. `code` único; `name` opcional. */
export interface CreateSeccionDto {
  code: string;
  name?: string | null;
}
export type UpdateSeccionDto = Partial<CreateSeccionDto>;

/** Un permiso que un convenio concede: un tipo de ausencia con sus parámetros. */
export interface ConvenioPermisoDto {
  absenceTypeId: number;
  /** Nombre del tipo de ausencia (resuelto, para pintar el editor). */
  name: string;
  /** Días máximos que concede el convenio para este permiso; `null` = sin límite fijado. */
  diasMax: number | null;
  /** Si el permiso es remunerado según el convenio; `null` = no fijado. */
  remunerado: boolean | null;
}

/**
 * Reemplaza el set COMPLETO de permisos de un convenio (idempotente): lo que no venga se borra, lo que venga
 * se crea/actualiza. Cada `absenceTypeId` debe existir en el catálogo de tipos de ausencia.
 */
export interface SetConvenioPermisosDto {
  permisos: { absenceTypeId: number; diasMax: number | null; remunerado: boolean | null }[];
}

// ---- Importador de fichas HR (POST /rrhh/import-fichas) ----

/** Una ficha PROCESADA por el importador (creada o actualizada). `passwordTemporal` solo en las creadas. */
export interface FichaImportadaDto {
  /** Fila real del Excel (1-indexada) para poder localizarla. */
  fila: number;
  /** Código de empresa (col A). */
  empresa: string;
  /** Código de empleado (col B). */
  codigo: string;
  nombre: string;
  email: string | null;
  /** Contraseña temporal generada para el login nuevo; el usuario la cambia al entrar. Solo en creados. */
  passwordTemporal?: string;
}

/** Una fila que NO se importó, con el motivo (fila de grupo/total, datos incompletos, choque de identidad…). */
export interface FichaSaltadaDto {
  fila: number;
  empresa: string;
  codigo: string;
  nombre: string;
  motivo: string;
}

/** Resultado del importador de fichas: creados / actualizados / saltados + recuento. */
export interface ImportFichasResultDto {
  creados: FichaImportadaDto[];
  actualizados: FichaImportadaDto[];
  saltados: FichaSaltadaDto[];
  totales: {
    creados: number;
    actualizados: number;
    saltados: number;
  };
}
