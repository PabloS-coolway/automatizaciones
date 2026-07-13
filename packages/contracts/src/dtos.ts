import { LabelVariant } from './variants';

/** Origen del maestro al generar etiquetas: base de datos o Excel subido. */
export type MasterSourceKind = 'db' | 'file';

/** Fila de etiqueta tal como la expone la API al front. */
export interface LabelRowDto {
  style: string;
  color: string;
  ref: string;
  size: string;
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
  balanced: boolean; // etiquetas == pedido leído (comprobación interna)
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
  reason: 'no_master_row' | 'missing_ean13' | 'missing_upc';
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

/** Item de GET /api/markets. */
export interface MarketDto {
  code: string;
  variant: LabelVariant;
  importadoPor: string;
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
  total: number;
  items: ReferenceDto[];
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
