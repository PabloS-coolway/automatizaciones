/** REQ-005 · Poda de ficheros de SAP a lo realmente comprado. Contratos API↔web. */

export type TipoFicheroSap = 'materiales' | 'surtidos' | 'tarifa906' | 'tarifa073';

/** Un par (familia, color SAP) que sí se compró — para leer el informe de lo que falta. */
export interface CompraDto {
  familia: string;
  colorSap: string;
}

/** Resultado de podar un fichero. `podadoBase64` es el fichero listo para subir a SAP (mismo formato). */
export interface FicheroPodadoDto {
  nombre: string;
  tipo: TipoFicheroSap;
  conservadas: number;
  retiradas: number;
  /** Comprado que NO aparecía en el fichero. Si no está vacío, el fichero venía incompleto → avisar. */
  compradoQueFalta: CompraDto[];
  podadoBase64: string;
}

export interface PodaResponse {
  /** Cuántas (familia, color) se dedujeron como compradas del borrador. */
  compras: number;
  ficheros: FicheroPodadoDto[];
  /** Nombres de ficheros que no se reconocieron (no se tocaron). */
  sinReconocer: string[];
}
