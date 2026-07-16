/**
 * Tipos base del dominio de etiquetas.
 * W = chica (referencias que empiezan por 76) · M = chico (empiezan por 86).
 */
export type Gender = 'W' | 'M';

/** Variante de fichero de par (= qué códigos lleva) — definida en el paquete de contratos compartido. */
export type { LabelVariant, LabelCode } from '@yorga/contracts';
export { variantCodes, variantFromCodes, variantLabel, LABEL_CODES } from '@yorga/contracts';

/** Talla como string ('36'..'46') — se conserva el literal del maestro/pedido. */
export type Size = string;
