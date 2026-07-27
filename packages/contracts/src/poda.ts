/** REQ-005 · Poda de ficheros de SAP a lo realmente comprado. Contratos API↔web. */

export type TipoFicheroSap = 'materiales' | 'surtidos' | 'tarifa906' | 'tarifa073';

/**
 * REQ-010 · Fase 1 — Sociedades del grupo. Al podar se puede elegir una y la poda reescribe su código en
 * los ficheros (todos salen con la `2000`). Catálogo cerrado: son dos, un selector fijo (no un CRUD).
 */
export const SOCIEDADES = [
  { codigo: '2000', nombre: 'VANYOR' },
  { codigo: '4000', nombre: 'COOLWAY USA' },
] as const;
export type SociedadCodigo = (typeof SOCIEDADES)[number]['codigo'];

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
  /**
   * REQ-010 · Líneas donde NO se pudo reescribir la sociedad (la columna esperada no traía un código de
   * sociedad). > 0 = revisar. Nunca se corrompe una columna: se avisa. `0`/ausente si no se eligió sociedad.
   */
  sociedadSospechosa: number;
  podadoBase64: string;
}

/* ─────────────── Surtidos · REQ-010 Fase 2 (catálogo ref → SURTD, lo gestiona Silvia) ─────────────── */

/** Un surtido asignado a una referencia, tal como lo ve la pantalla de administración. */
export interface SurtidoDto {
  id: number;
  ref: string;
  surtido: string;
}

/** Alta de surtido. `ref` es la identidad (única): un surtido por referencia. */
export interface CreateSurtidoDto {
  ref: string;
  surtido: string;
}

/** Edición: sólo cambia el código de surtido; la `ref` es la identidad. */
export interface UpdateSurtidoDto {
  surtido: string;
}

export interface PodaResponse {
  /** Cuántas (familia, color) se dedujeron como compradas del borrador. */
  compras: number;
  ficheros: FicheroPodadoDto[];
  /** Nombres de ficheros que no se reconocieron (no se tocaron). */
  sinReconocer: string[];
  /**
   * BUG-006 · Refs compradas SIN código de color (Horma) en el borrador. Si no está vacío, hay que
   * rellenar la Horma: sin ella, la poda por color (materiales/surtidos) de esas refs no es fiable.
   */
  comprasSinColor: string[];
}
