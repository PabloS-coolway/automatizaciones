import { FilaSap } from '../domain/poda';

/** Los cuatro ficheros de SAP que se podan, con dónde está su `MATNR` (familia) y su color (si lo trae). */
export type TipoFicheroSap = 'materiales' | 'surtidos' | 'tarifa906' | 'tarifa073';

/**
 * `sociedadCols` (REQ-010 · Fase 1): índices 0-based donde va el código de sociedad, **verificados contra
 * los ficheros reales del 24/07**. Ojo A906: la sociedad es `VKORG` (idx4), NO la "col 3" del correo (que es
 * `KSCHL`). A073 no la lleva. Materiales la repite en idx1 e idx2 (`EKORG`).
 */
const FORMATOS: Record<
  TipoFicheroSap,
  { matnrCol: number; colorCol?: number; surtdCol?: number; sociedadCols: number[] }
> = {
  materiales: { matnrCol: 6, colorCol: 29, sociedadCols: [1, 2] },
  surtidos: { matnrCol: 4, colorCol: 6, surtdCol: 8, sociedadCols: [1] }, // SURTD (idx8): el surtido a filtrar
  tarifa906: { matnrCol: 7, sociedadCols: [4] }, // tarifas: una fila por familia, sin color
  tarifa073: { matnrCol: 4, sociedadCols: [] }, // A073 no lleva sociedad
};

/** REQ-010 · Columnas donde reescribir la sociedad en cada tipo de fichero (ver `FORMATOS`). */
export function sociedadColsDe(tipo: TipoFicheroSap): number[] {
  return FORMATOS[tipo].sociedadCols;
}

/** REQ-011 · Índice de la columna SURTD del fichero de surtidos (para reescribir el surtido al expandir). */
export function surtdColDe(tipo: TipoFicheroSap): number | undefined {
  return FORMATOS[tipo].surtdCol;
}

/** REQ-011 · Reescribe el campo SURTD (idx `col`) de una línea TSV con `codigo`, dejando el resto intacto. */
export function reescribirSurtidoEnLinea(cruda: string, col: number, codigo: string): string {
  const campos = cruda.split('\t');
  campos[col] = codigo;
  return campos.join('\t');
}

/** Adivina el tipo por el nombre del fichero (los exports de SAP tienen nombres reconocibles). */
export function tipoPorNombre(nombre: string): TipoFicheroSap | null {
  if (/zcalvanyor/i.test(nombre)) return 'materiales';
  if (/surtido/i.test(nombre)) return 'surtidos';
  if (/a906/i.test(nombre)) return 'tarifa906';
  if (/a073/i.test(nombre)) return 'tarifa073';
  return null;
}

export interface FicheroSapLeido {
  filas: FilaSap[];
  eol: string;
  finalConSalto: boolean;
}

/**
 * Lee un fichero de SAP (TSV) a `FilaSap[]`. Una línea es de DATO si su columna `MATNR` es una familia de
 * 8 dígitos; el resto (cabeceras, comentarios `-->`, `***`, líneas en blanco) se marca como no-dato y se
 * conservará intacta al podar. Se preserva el salto de línea original (es un fichero que se sube a SAP).
 */
export function leerFicheroSap(contenido: string, tipo: TipoFicheroSap): FicheroSapLeido {
  const eol = contenido.includes('\r\n') ? '\r\n' : '\n';
  const finalConSalto = /\r?\n$/.test(contenido);
  const lineas = contenido.split(/\r?\n/);
  if (finalConSalto && lineas[lineas.length - 1] === '') lineas.pop(); // el split deja un '' final

  const { matnrCol, colorCol, surtdCol } = FORMATOS[tipo];
  const filas: FilaSap[] = lineas.map((cruda) => {
    const c = cruda.split('\t');
    const matnr = (c[matnrCol] ?? '').trim();
    const esDato = /^\d{8}$/.test(matnr);
    return {
      cruda,
      esDato,
      familia: esDato ? matnr : undefined,
      colorSap: esDato && colorCol !== undefined ? (c[colorCol] ?? '').trim() : undefined,
      surtido: esDato && surtdCol !== undefined ? (c[surtdCol] ?? '').trim() : undefined,
    };
  });
  return { filas, eol, finalConSalto };
}

/** Reescribe el fichero podado conservando exactamente el salto de línea original. */
export function serializarFicheroSap(conservadas: string[], eol: string, finalConSalto: boolean): string {
  return conservadas.join(eol) + (finalConSalto ? eol : '');
}
