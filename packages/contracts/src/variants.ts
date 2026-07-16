/**
 * Los tres códigos que la herramienta sabe imprimir (RF-06). Son **independientes**: el generador ya
 * decide uno a uno si toca imprimirlo, y el Excel de salida monta sus columnas según los que traiga.
 */
export type LabelCode = 'CODE128' | 'UPC' | 'EAN';

/**
 * Orden canónico. No es estético: es el que reproduce **exactamente** los nombres de variante de
 * siempre (`CODE128_EAN`, `UPC_EAN`…), que van en el nombre del fichero de salida y en la celda
 * «Variante» del resumen. Cambiar este orden cambiaría esos dos, y los consume otro proceso.
 */
export const LABEL_CODES: LabelCode[] = ['CODE128', 'UPC', 'EAN'];

/** Cómo se llama cada código en pantalla. */
export const LABEL_CODE_LABELS: Record<LabelCode, string> = {
  CODE128: 'CODE128',
  UPC: 'UPC',
  EAN: 'EAN',
};

/**
 * Una variante es sencillamente **qué códigos lleva la etiqueta**, y su nombre es esa lista unida por
 * guión bajo en orden canónico. Las 4 de siempre son 4 de estas 7: el resto ya funcionaban en el motor,
 * sólo que no se podían pedir.
 */
export type LabelVariant =
  | 'CODE128'
  | 'UPC'
  | 'EAN'
  | 'CODE128_UPC'
  | 'CODE128_EAN'
  | 'UPC_EAN'
  | 'CODE128_UPC_EAN';

export const LABEL_VARIANTS: LabelVariant[] = [
  'CODE128',
  'UPC',
  'EAN',
  'CODE128_UPC',
  'CODE128_EAN',
  'UPC_EAN',
  'CODE128_UPC_EAN',
];

/** Los códigos que lleva una variante. El nombre YA es la lista: ningún código lleva "_". */
export function variantCodes(variant: LabelVariant): LabelCode[] {
  return variant.split('_') as LabelCode[];
}

/**
 * El nombre canónico de un conjunto de códigos. Ignora el orden en que lleguen y los repetidos: lo que
 * manda es `LABEL_CODES`, para que el mismo conjunto dé siempre el mismo nombre de fichero.
 * Una etiqueta **sin ningún código** no es una etiqueta: por eso devuelve `null` en vez de "".
 */
export function variantFromCodes(codes: LabelCode[]): LabelVariant | null {
  const elegidos = LABEL_CODES.filter((c) => codes.includes(c));
  return elegidos.length ? (elegidos.join('_') as LabelVariant) : null;
}

/** Cómo se lee una variante en pantalla: "CODE128_EAN" no dice nada; "CODE128 + EAN" sí. */
export function variantLabel(variant: LabelVariant): string {
  return variantCodes(variant).join(' + ');
}
