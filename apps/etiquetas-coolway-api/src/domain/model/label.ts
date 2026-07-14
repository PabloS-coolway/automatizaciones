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

/**
 * Lo que NO ha entrado en el fichero de etiquetas. Se reporta siempre, nunca se inventa (RF-12).
 * `excluded_model` no es un fallo: es un modelo que el negocio ha decidido no etiquetar (BACKPACK,
 * que no se vende). Se lista igual para que nadie piense que el pedido salió entero.
 */
export interface MissingCode {
  style: string;
  color: string;
  size: string;
  qty: number; // pares afectados
  ref?: string;
  reason: 'no_master_row' | 'missing_ean13' | 'missing_upc' | 'excluded_model';
}
