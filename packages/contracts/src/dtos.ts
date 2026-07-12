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
  orderPairs: number;
  labelPairs: number;
  balanced: boolean;
  diff: number;
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

/** Resultado de POST /api/maestro/seed (subir REFERENCIAS COOLWAY.xlsx completo). */
export interface SeedReportDto {
  rows: number; // filas leídas del Excel
  valid: number; // filas utilizables (con modelo, color, ref y talla)
  upserted: number; // filas guardadas
  failed: number; // rechazadas (p.ej. EAN13 duplicado)
  created: number;
  updated: number;
  total: number; // SKU en el maestro tras la carga
  issues: SeedIssueDto[]; // qué filas se quedaron fuera y por qué
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
