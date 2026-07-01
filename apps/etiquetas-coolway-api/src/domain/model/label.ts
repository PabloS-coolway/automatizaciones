/** Fila del fichero de etiquetas de salida (una por talla). */
export interface LabelRow {
  style: string;
  color: string;
  ref: string;
  size: string;
  sku: string;
  qty: number;
  ean13?: string;
  upc?: string;
  code128?: string;
  importadoPor?: string; // RF-13: VANYOR / COOLWAY USA / cliente
}

/** Código faltante detectado: se reporta, nunca se inventa (RF-12). */
export interface MissingCode {
  style: string;
  color: string;
  size: string;
  qty: number; // pares afectados por este código faltante
  ref?: string;
  reason: 'no_master_row' | 'missing_ean13' | 'missing_upc';
}
