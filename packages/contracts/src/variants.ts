/** Variantes de fichero de par según lo que pide el cliente (RF-06). */
export type LabelVariant = 'EAN' | 'UPC' | 'CODE128_EAN' | 'UPC_EAN';

export const LABEL_VARIANTS: LabelVariant[] = ['EAN', 'UPC', 'CODE128_EAN', 'UPC_EAN'];
