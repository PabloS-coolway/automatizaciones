import { LabelVariant } from './variants';

/** Origen del maestro al generar etiquetas: base de datos o Excel subido. */
export type MasterSourceKind = 'db' | 'file';

/** Fila de etiqueta tal como la expone la API al front. */
export interface LabelRowDto {
  style: string;
  color: string;
  ref: string;
  size: string; // la que se IMPRIME
  /** REQ-003 · de dónde vino (PDF) y qué talla lleva el código. Vacías en calzado (las tres coinciden). */
  tallaSap?: string;
  tallaTiendas?: string;
  sku: string;
  qty: number;
  ean13?: string;
  upc?: string;
  code128?: string;
  importadoPor?: string;
}

export interface ReconciliationDto {
  orderPairs: number; // pares LEÍDOS del pedido
  labelPairs: number; // pares de las etiquetas generadas
  /** Pares de modelos excluidos a propósito (no se etiquetan). No son un fallo. */
  excludedPairs: number;
  balanced: boolean; // etiquetas + excluidos == pedido leído
  diff: number;

  declaredPairs?: number; // lo que el PDF declara al pie ("TOTAL PAIRS")
  declaredBoxes?: number;
  parsedBoxes: number;
  /** false = el parser se dejó líneas del PDF → las etiquetas están INCOMPLETAS. */
  matchesDeclared: boolean;
  missedPairs: number; // pares que el PDF declara y no hemos leído
}

export interface MissingCodeDto {
  style: string;
  color: string;
  size: string;
  qty: number;
  ref?: string;
  /** `excluded_model`: el negocio decidió no etiquetar ese modelo (no es un fallo, pero se reporta). */
  reason: 'no_master_row' | 'missing_ean13' | 'missing_upc' | 'excluded_model';
}

/** Resultado de generar etiquetas de UN pedido. */
export interface GenerateLabelsResultDto {
  orderNumber: string;
  variant: LabelVariant;
  importadoPor?: string;
  rows: LabelRowDto[];
  missing: MissingCodeDto[];
  reconciliation: ReconciliationDto;
}

/** Un fichero generado, listo para descargar (Excel en base64) o previsualizar (rows). */
export interface GeneratedFileDto {
  orderNumber: string;
  fileName: string;
  fileBase64: string;
  rows: LabelRowDto[];
  reconciliation: ReconciliationDto;
  missing: MissingCodeDto[];
}

/** Respuesta del endpoint POST /api/labels/generate (batch). */
export interface GenerateLabelsHttpResponse {
  variant: LabelVariant;
  importadoPor?: string;
  files: GeneratedFileDto[];
}

/**
 * Item de GET /api/markets (los destinos ACTIVOS, para el desplegable al generar).
 * REQ-004: ya no viven en código, sino en la BD, y los gestiona Silvia.
 */
export interface MarketDto {
  code: string;
  name: string;
  variant: LabelVariant;
  importadoPor: string;
}

/* ───────────────────────────── Destinos · REQ-004 (CRUD, sólo admin) ───────────────────────────── */

/** Un destino tal como lo ve la pantalla de administración. */
export interface DestinationDto {
  id: number;
  code: string;
  name: string;
  variant: LabelVariant;
  importadoPor: string;
  active: boolean;
}

/** Alta de destino. `variant` va acotada: es lo que el motor sabe imprimir, no texto libre. */
export interface CreateDestinationDto {
  code: string;
  name: string;
  variant: LabelVariant;
  importadoPor: string;
}

/** Edición (parcial). El `code` NO se cambia: es la identidad del destino. */
export interface UpdateDestinationDto {
  name?: string;
  variant?: LabelVariant;
  importadoPor?: string;
  active?: boolean;
}

/** Fila del maestro (BD) expuesta al front. */
export interface ReferenceDto {
  style: string;
  color: string;
  ref: string;
  size: string;
  sku: string;
  ean13?: string | null;
  upc?: string | null;
  colorNameWeb?: string | null;
}

/** GET /api/maestro/stats */
export interface MaestroStatsDto {
  total: number;
  conEan: number;
  conUpc: number;
  models: { style: string; count: number }[];
}

/** GET /api/maestro/references */
export interface ReferencesPageDto {
  total: number; // filas que cumplen el filtro
  items: ReferenceDto[];
  grandTotal: number; // filas del maestro SIN filtrar → permite enseñar siempre "N de M"
}

/* ───────────────────────── Maestro · filtrar y ordenar (REQ-002, fases 2-3) ─────────────────────────
 * El maestro se pagina en la BD (5.736 SKU): filtrar y ordenar en el navegador sólo miraría las filas
 * de la página y daría un resultado FALSO con apariencia de correcto. Por eso viaja al servidor.
 */

/** Columnas por las que se puede ORDENAR. Lista blanca: nunca un `orderBy` que venga del cliente. */
export const REFERENCE_SORT_COLUMNS = ['style', 'color', 'ref', 'size', 'sku', 'ean13', 'upc', 'colorNameWeb'] as const;
export type ReferenceSortColumn = (typeof REFERENCE_SORT_COLUMNS)[number];

/** Columnas con autofiltro de casillas (pocos valores distintos → desplegable usable). */
export const REFERENCE_FACET_COLUMNS = ['style', 'color', 'size', 'colorNameWeb'] as const;
export type ReferenceFacetColumn = (typeof REFERENCE_FACET_COLUMNS)[number];

/** Cómo se representa "la celda está vacía" en un filtro de valores. Compartido API↔web. */
export const VALOR_VACIO = '(vacío)';

export type SortDir = 'asc' | 'desc';

/** Filtros del maestro. Los de casillas son multivalor; los de texto, "contiene". */
export interface ReferenceFiltersDto {
  search?: string; // búsqueda global (la que ya existía)
  style?: string[];
  color?: string[];
  size?: string[];
  colorNameWeb?: string[];
  ref?: string;
  sku?: string;
  ean13?: string;
  upc?: string;
  sort?: ReferenceSortColumn;
  dir?: SortDir;
}

export interface FacetDto {
  value: string;
  count: number;
}

/** Valores que ofrece el desplegable de una columna, ya con los filtros de las DEMÁS aplicados. */
export interface FacetsDto {
  column: ReferenceFacetColumn;
  values: FacetDto[];
}

export interface ImportIssueDto {
  ref: string;
  size: string;
  reason: 'missing_upc' | 'missing_ean13' | 'invalid_ean13' | 'invalid_upc' | 'style_color_mismatch';
  detail?: string;
}

/** Fila del maestro que no se pudo guardar (esa talla faltará al generar etiquetas). */
export interface SeedIssueDto {
  style: string;
  color: string;
  ref: string;
  size: string;
  reason: 'duplicate_ean13' | 'rejected';
  detail?: string;
}

/** Una fila del maestro implicada en un EAN13 compartido. */
export interface SharedEanRowDto {
  style: string;
  color: string;
  ref: string;
  size: string;
}

/**
 * Un EAN13 que aparece en más de un PRODUCTO (modelo/color distinto). No bloquea la carga
 * —la fila entra—, pero es un error del maestro: el mismo código de barras identificaría a
 * dos productos que se venden por separado. Se avisa en cada carga hasta que se corrija.
 *
 * OJO: un mismo modelo+color con dos referencias (re-referenciación en SAP) NO aparece aquí:
 * es legítimo y se carga sin ruido.
 */
export interface SharedEan13Dto {
  ean13: string;
  rows: SharedEanRowDto[];
}

/** Fila del maestro BORRADA por quedar huérfana al cargar (típico: se corrigió su talla). */
export interface RemovedRowDto {
  style: string;
  color: string;
  ref: string;
  size: string;
}

/** Resultado de POST /api/maestro/seed (subir REFERENCIAS COOLWAY.xlsx completo). */
export interface SeedReportDto {
  rows: number; // filas leídas del Excel
  valid: number; // filas utilizables (con modelo, color, ref y talla)
  upserted: number; // filas guardadas
  failed: number; // rechazadas (errores de BD; ya NO incluye el EAN13 duplicado)
  created: number;
  updated: number;
  total: number; // SKU en el maestro tras la carga
  issues: SeedIssueDto[]; // qué filas se quedaron fuera y por qué
  sharedEan13: SharedEan13Dto[]; // avisos: mismo EAN13 en productos distintos (entran, pero hay que corregirlo)
  /** Filas borradas por quedar huérfanas (estaban en la BD, ya no en el Excel). Nunca en silencio. */
  removed: RemovedRowDto[];
}

/** Resultado de POST /api/maestro/import (subir EAN.xlsm + UPC.xlsm). */
export interface ImportReportDto {
  eanRows: number;
  upcRows: number;
  merged: number;
  upserted: number;
  created: number;
  updated: number;
  skipped: number;
  issues: ImportIssueDto[];
}
