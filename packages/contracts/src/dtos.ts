import { LabelVariant } from './variants';

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

/** Un fichero generado, listo para descargar (Excel en base64). */
export interface GeneratedFileDto {
  orderNumber: string;
  fileName: string;
  fileBase64: string;
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
