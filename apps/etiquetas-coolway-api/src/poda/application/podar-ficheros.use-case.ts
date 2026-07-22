import { Compra, comprasDelBorrador, LineaBorrador, podar } from '../domain/poda';
import { leerFicheroSap, serializarFicheroSap, tipoPorNombre, TipoFicheroSap } from '../infrastructure/sap-file-reader';

/** Un fichero de SAP tal como entra (nombre + contenido de texto). */
export interface FicheroEntrada {
  nombre: string;
  contenido: string;
}

/** Un fichero ya podado, con su informe. */
export interface FicheroPodado {
  nombre: string;
  tipo: TipoFicheroSap;
  /** El fichero podado, listo para subir a SAP (mismo formato, sólo con menos líneas). */
  podado: string;
  conservadas: number;
  retiradas: number;
  /** Comprado que NO aparecía en el fichero (si no está vacío, el fichero venía incompleto → avisar). */
  compradoQueFalta: Compra[];
}

export interface ResultadoPodaFicheros {
  /** Lo que se dedujo que se compró (del borrador): la red de seguridad para leer el resto del informe. */
  compras: Compra[];
  ficheros: FicheroPodado[];
  /** Ficheros que no se reconocieron por su nombre (no se tocan; se avisa). */
  sinReconocer: string[];
}

/**
 * REQ-005 · Poda un lote de ficheros de SAP dejando sólo lo realmente comprado según el borrador. Es pura
 * orquestación sobre el dominio: qué se compró (borrador) → filtrar cada fichero. No inventa nada y avisa de
 * lo que falte (fichero incompleto) o no reconozca.
 */
export function podarFicheros(borrador: LineaBorrador[], entradas: FicheroEntrada[]): ResultadoPodaFicheros {
  const compras = comprasDelBorrador(borrador);
  const ficheros: FicheroPodado[] = [];
  const sinReconocer: string[] = [];

  for (const e of entradas) {
    const tipo = tipoPorNombre(e.nombre);
    if (!tipo) {
      sinReconocer.push(e.nombre);
      continue;
    }
    const { filas, eol, finalConSalto } = leerFicheroSap(e.contenido, tipo);
    const r = podar(filas, compras);
    ficheros.push({
      nombre: e.nombre,
      tipo,
      podado: serializarFicheroSap(r.conservadas, eol, finalConSalto),
      conservadas: r.conservadasDato, // las referencias que quedan (sin contar cabeceras)
      retiradas: r.retiradas,
      compradoQueFalta: r.compradoQueFalta,
    });
  }

  return { compras, ficheros, sinReconocer };
}
