import { FilaSap } from '../domain/poda';

/** Los cuatro ficheros de SAP que se podan, con dónde está su `MATNR` (familia) y su color (si lo trae). */
export type TipoFicheroSap = 'materiales' | 'surtidos' | 'tarifa906' | 'tarifa073';

const FORMATOS: Record<TipoFicheroSap, { matnrCol: number; colorCol?: number }> = {
  materiales: { matnrCol: 6, colorCol: 29 },
  surtidos: { matnrCol: 4, colorCol: 6 },
  tarifa906: { matnrCol: 7 }, // tarifas: una fila por familia, sin color
  tarifa073: { matnrCol: 4 },
};

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

  const { matnrCol, colorCol } = FORMATOS[tipo];
  const filas: FilaSap[] = lineas.map((cruda) => {
    const c = cruda.split('\t');
    const matnr = (c[matnrCol] ?? '').trim();
    const esDato = /^\d{8}$/.test(matnr);
    return {
      cruda,
      esDato,
      familia: esDato ? matnr : undefined,
      colorSap: esDato && colorCol !== undefined ? (c[colorCol] ?? '').trim() : undefined,
    };
  });
  return { filas, eol, finalConSalto };
}

/** Reescribe el fichero podado conservando exactamente el salto de línea original. */
export function serializarFicheroSap(conservadas: string[], eol: string, finalConSalto: boolean): string {
  return conservadas.join(eol) + (finalConSalto ? eol : '');
}
