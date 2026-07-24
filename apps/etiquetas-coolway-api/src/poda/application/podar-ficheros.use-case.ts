import {
  Compra,
  comprasDelBorrador,
  comprasSinColor,
  FilaSap,
  LineaBorrador,
  podar,
  reescribirSociedadLinea,
  SociedadCodigo,
} from '../domain/poda';
import { familiaDeRef, normalizeColor } from '../domain/familia';
import {
  leerFicheroSap,
  serializarFicheroSap,
  sociedadColsDe,
  tipoPorNombre,
  TipoFicheroSap,
} from '../infrastructure/sap-file-reader';

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
  /**
   * REQ-010 · Líneas de dato en las que NO se pudo reescribir la sociedad porque la columna esperada no
   * traía un código de sociedad conocido. > 0 = revisar (la columna configurada no era la de la sociedad
   * para este fichero). Nunca se pisa una columna que no sea la sociedad: se avisa en vez de corromper.
   */
  sociedadSospechosa: number;
}

export interface ResultadoPodaFicheros {
  /** Lo que se dedujo que se compró (del borrador): la red de seguridad para leer el resto del informe. */
  compras: Compra[];
  ficheros: FicheroPodado[];
  /** Ficheros que no se reconocieron por su nombre (no se tocan; se avisa). */
  sinReconocer: string[];
  /**
   * BUG-006 · Refs compradas SIN código de color (Horma) en el borrador. Si no está vacío, la poda por color
   * (materiales/surtidos) de esas refs no es fiable: hay que rellenar la Horma en el borrador. Se avisa aparte
   * de `compradoQueFalta` para no confundir "falta el color en el borrador" con "el fichero venía incompleto".
   */
  comprasSinColor: string[];
}

/**
 * REQ-005 · Poda un lote de ficheros de SAP dejando sólo lo realmente comprado según el borrador. Es pura
 * orquestación sobre el dominio: qué se compró (borrador) → filtrar cada fichero. No inventa nada y avisa de
 * lo que falte (fichero incompleto) o no reconozca.
 */
/** REQ-010 · Fase 2 — un surtido (SURTD) asignado a una referencia. */
export interface SurtidoAsignado {
  ref: string;
  surtido: string;
}

/**
 * REQ-010 · Fase 2 — predicado para el fichero de surtidos: una fila comprada se conserva sólo si su surtido
 * es el asignado a su ref. La ref se recupera de (familia, color) usando el borrador. Si la ref no tiene
 * asignación, se conserva (el filtro de surtido es opt-in por referencia).
 */
function construirSurtidoOk(borrador: LineaBorrador[], asignacion: Map<string, string>): (fila: FilaSap) => boolean {
  if (asignacion.size === 0) return () => true;
  const refDe = new Map<string, string>();
  for (const l of borrador) {
    if (!(l.suma > 0)) continue;
    try {
      refDe.set(`${familiaDeRef(l.ourRef)}|${normalizeColor(l.colorSap)}`, String(l.ourRef).trim());
    } catch {
      // ref con formato raro: ya la reporta comprasDelBorrador; aquí no rompemos el filtro.
    }
  }
  return (fila) => {
    if (fila.familia === undefined || fila.colorSap === undefined) return true;
    const ref = refDe.get(`${fila.familia}|${normalizeColor(fila.colorSap)}`);
    if (!ref) return true; // no sabemos la ref → no filtramos
    const asignado = asignacion.get(ref);
    if (!asignado) return true; // ref sin surtido asignado → se conserva (opt-in)
    return (fila.surtido ?? '') === asignado;
  };
}

export function podarFicheros(
  borrador: LineaBorrador[],
  entradas: FicheroEntrada[],
  sociedad?: SociedadCodigo,
  surtidos?: SurtidoAsignado[],
): ResultadoPodaFicheros {
  const compras = comprasDelBorrador(borrador);
  const ficheros: FicheroPodado[] = [];
  const sinReconocer: string[] = [];
  const surtidoOk = construirSurtidoOk(borrador, new Map((surtidos ?? []).map((s) => [s.ref.trim(), s.surtido.trim()])));

  for (const e of entradas) {
    const tipo = tipoPorNombre(e.nombre);
    if (!tipo) {
      sinReconocer.push(e.nombre);
      continue;
    }
    const { filas, eol, finalConSalto } = leerFicheroSap(e.contenido, tipo);

    // REQ-010 · Fase 1 — si se eligió sociedad, se reescribe en las líneas de dato (A073 no la lleva).
    const cols = sociedadColsDe(tipo);
    let sociedadSospechosa = 0;
    const filasFinal =
      sociedad && cols.length > 0
        ? filas.map((f) => {
            if (!f.esDato) return f;
            const { linea, sospechosa } = reescribirSociedadLinea(f.cruda, cols, sociedad);
            if (sospechosa) sociedadSospechosa++;
            return { ...f, cruda: linea };
          })
        : filas;

    // El filtro de surtido (Fase 2) sólo aplica al fichero de surtidos.
    const r = podar(filasFinal, compras, tipo === 'surtidos' ? surtidoOk : undefined);
    ficheros.push({
      nombre: e.nombre,
      tipo,
      podado: serializarFicheroSap(r.conservadas, eol, finalConSalto),
      conservadas: r.conservadasDato, // las referencias que quedan (sin contar cabeceras)
      retiradas: r.retiradas,
      compradoQueFalta: r.compradoQueFalta,
      sociedadSospechosa,
    });
  }

  return { compras, ficheros, sinReconocer, comprasSinColor: comprasSinColor(borrador) };
}
