import {
  Compra,
  comprasDelBorrador,
  comprasSinColor,
  LineaBorrador,
  podar,
  podarSurtidos,
  reescribirSociedadLinea,
  SociedadCodigo,
} from '../domain/poda';
import {
  leerFicheroSap,
  reescribirSurtidoEnLinea,
  serializarFicheroSap,
  sociedadColsDe,
  surtdColDe,
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
  /** REQ-011 · Líneas de surtido GENERADAS por expansión del catálogo (0 en el resto de ficheros). */
  surtidosGenerados: number;
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
/** REQ-011 · una entrada del catálogo de surtidos: un código SURTD dentro de un grupo (prefijo de ref). */
export interface SurtidoDeGrupo {
  grupo: string;
  codigo: string;
}

/** REQ-011 · Catálogo de surtidos indexado por grupo (prefijo), en orden de alta, para expandir cada producto. */
function catalogoPorGrupoDe(catalogo: SurtidoDeGrupo[]): Map<string, string[]> {
  const porGrupo = new Map<string, string[]>();
  for (const s of catalogo) {
    const arr = porGrupo.get(s.grupo) ?? [];
    if (!arr.includes(s.codigo)) arr.push(s.codigo);
    porGrupo.set(s.grupo, arr);
  }
  return porGrupo;
}

export function podarFicheros(
  borrador: LineaBorrador[],
  entradas: FicheroEntrada[],
  sociedad?: SociedadCodigo,
  surtidos?: SurtidoDeGrupo[],
): ResultadoPodaFicheros {
  const compras = comprasDelBorrador(borrador);
  const ficheros: FicheroPodado[] = [];
  const sinReconocer: string[] = [];
  const catalogoSurtidos = catalogoPorGrupoDe(surtidos ?? []);

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

    // REQ-011 (corrección) · el fichero de surtidos se EXPANDE al catálogo (cada producto comprado sale con
    // todos los SURTD de su grupo); el resto de ficheros se poda normal. Sin catálogo, se poda normal también.
    const surtdCol = surtdColDe(tipo);
    let surtidosGenerados = 0;
    let r;
    if (tipo === 'surtidos' && catalogoSurtidos.size > 0 && surtdCol !== undefined) {
      const rs = podarSurtidos(filasFinal, compras, catalogoSurtidos, (cruda, cod) => reescribirSurtidoEnLinea(cruda, surtdCol, cod));
      surtidosGenerados = rs.generadas;
      r = rs;
    } else {
      r = podar(filasFinal, compras);
    }
    ficheros.push({
      nombre: e.nombre,
      tipo,
      podado: serializarFicheroSap(r.conservadas, eol, finalConSalto),
      conservadas: r.conservadasDato, // las referencias/líneas que quedan (sin contar cabeceras)
      retiradas: r.retiradas,
      compradoQueFalta: r.compradoQueFalta,
      sociedadSospechosa,
      surtidosGenerados,
    });
  }

  return { compras, ficheros, sinReconocer, comprasSinColor: comprasSinColor(borrador) };
}
