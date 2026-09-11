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
}

/** Un convenio colectivo (estructura; el contenido de permisos lo rellena RRHH). */
export interface ConvenioDto {
  id: number;
  code: string | null;
  name: string;
}

/** Una categoría profesional del catálogo (AUX.INFORM, DEPENDIENT…). */
export interface CategoriaDto {
  id: number;
  code: string | null;
  name: string;
}

/** Un tipo/código de contrato del catálogo (100, 200, 500…). */
export interface ContractTypeDto {
  id: number;
  code: string;
  name: string | null;
}

/** Una sección del catálogo (código de sección del maestro de RRHH). */
export interface SeccionDto {
  id: number;
  code: string;
  name: string | null;
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
