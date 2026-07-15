/** Fila del fichero de etiquetas de salida (una por talla). */
export interface LabelRow {
  style: string;
  color: string;
  ref: string;
  /** La talla que se IMPRIME (40 · S · 36-38 · U). */
  size: string;
  /**
   * REQ-003 · Trazabilidad de la conversión, para poder VALIDAR de un vistazo que es correcta:
   * de dónde salió la fila (la talla del PDF) y qué talla acabó en el código de barras.
   * Sólo se rellenan cuando difieren de `size` — en calzado las tres coinciden y no se muestran.
   */
  tallaSap?: string;
  tallaTiendas?: string;
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
