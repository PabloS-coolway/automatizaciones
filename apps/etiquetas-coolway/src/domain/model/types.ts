/**
 * Tipos base del dominio de etiquetas.
 * W = chica (referencias que empiezan por 76) · M = chico (empiezan por 86).
 */
export type Gender = 'W' | 'M';

/** Variantes de fichero de par según lo que pide el cliente (RF-06). */
export type LabelVariant = 'EAN' | 'UPC' | 'CODE128_EAN' | 'UPC_EAN';

/** Talla como string ('36'..'46') — se conserva el literal del maestro/pedido. */
export type Size = string;
