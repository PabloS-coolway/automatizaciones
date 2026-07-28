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
  /**
   * REQ-011 · Líneas de surtido **generadas** por expansión del catálogo (cada producto comprado sale con todos
   * los SURTD de su grupo). `0` en el resto de ficheros. El fichero crece a propósito: se informa para no
   * confundir con un error.
   */
  surtidosGenerados: number;
  podadoBase64: string;
}

/* ─────────── Surtidos · REQ-011 (catálogo por PREFIJO de referencia, lo gestiona Silvia) ─────────── */

/** Grupos de surtido por prefijo de referencia. **Extensible**; de momento 76 (chica) y 86 (chico). */
export const SURTIDO_GRUPOS = ['76', '86'] as const;
export type SurtidoGrupo = (typeof SURTIDO_GRUPOS)[number];

export const SURTIDO_GRUPO_LABELS: Record<SurtidoGrupo, string> = {
  '76': 'Chica (ref. 76…)',
  '86': 'Chico (ref. 86…)',
};

/** Un código de surtido (SURTD) dentro de un grupo, tal como lo ve la pantalla. */
export interface PodaSurtidoDto {
  id: number;
  grupo: string;
  codigo: string;
}

/** Alta de un código de surtido en un grupo. */
export interface CreatePodaSurtidoDto {
  grupo: string;
  codigo: string;
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
