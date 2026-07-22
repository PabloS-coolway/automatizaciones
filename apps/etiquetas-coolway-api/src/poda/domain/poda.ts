import { familiaDeRef, normalizeColor } from './familia';

/** Una línea del borrador de prepedidos (lo que realmente se compró se lee de aquí). */
export interface LineaBorrador {
  /** `Our Reference`: la ref color-a-color (7 dígitos). */
  ourRef: string;
  /** `Horma`: el código de color de SAP (3 dígitos). */
  colorSap: string | number;
  /** `Suma`: pares comprados. > 0 = comprado; vacío/0 = continuativo (no se sube). */
  suma: number;
}

/** Lo comprado, ya en las claves con las que se cruza contra los ficheros de SAP. */
export interface Compra {
  familia: string;
  colorSap: string;
}

/** Una fila de un fichero de SAP, ya parseada a lo mínimo para decidir si se conserva. */
export interface FilaSap {
  /** La familia (`MATNR`). Undefined en líneas que no son de dato (cabeceras de tarifas). */
  familia?: string;
  /** El color SAP, si el fichero lo trae (materiales/surtidos sí; tarifas no). */
  colorSap?: string;
  /** La línea tal cual, para reescribirla intacta en la salida (es un fichero que se sube a SAP). */
  cruda: string;
  /** ¿Es una línea de dato (candidata a podarse) o de cabecera/comentario (se conserva siempre)? */
  esDato: boolean;
}

export interface ResultadoPoda {
  /** Las líneas crudas que se conservan (incluye cabeceras), en el mismo orden que venían. */
  conservadas: string[];
  /** Cuántas líneas de DATO se conservan (las referencias — sin contar cabeceras). */
  conservadasDato: number;
  /** Cuántas líneas de dato se retiraron. */
  retiradas: number;
  /**
   * Compras del borrador que **no aparecieron en el fichero de SAP**. Si esto no está vacío, el fichero
   * está incompleto respecto a lo comprado: se AVISA (nunca se da la poda por buena en silencio).
   */
  compradoQueFalta: Compra[];
}

/** Del borrador, lo comprado (`Suma` > 0), con la familia calculada y el color normalizado. */
export function comprasDelBorrador(lineas: LineaBorrador[]): Compra[] {
  const compras: Compra[] = [];
  const vistas = new Set<string>();
  for (const l of lineas) {
    if (!(l.suma > 0)) continue; // vacío o 0 = continuativo, no se sube
    const compra: Compra = { familia: familiaDeRef(l.ourRef), colorSap: normalizeColor(l.colorSap) };
    const clave = `${compra.familia}|${compra.colorSap}`;
    if (!vistas.has(clave)) {
      vistas.add(clave);
      compras.push(compra);
    }
  }
  return compras;
}

/** ¿La fila (familia + color) corresponde a algo comprado? Si la fila no trae color, basta la familia. */
function estaComprada(fila: FilaSap, compras: Compra[]): boolean {
  return compras.some(
    (c) => c.familia === fila.familia && (fila.colorSap === undefined || normalizeColor(fila.colorSap) === c.colorSap),
  );
}

/**
 * Poda un fichero de SAP dejando **sólo** las filas de dato que corresponden a lo comprado. Las líneas que
 * no son de dato (cabeceras) se conservan intactas. NUNCA compone una línea: sólo deja pasar o quita.
 */
export function podar(filas: FilaSap[], compras: Compra[]): ResultadoPoda {
  const conservadas: string[] = [];
  const familiasEnFichero = new Set<string>();
  const paresEnFichero = new Set<string>();
  let retiradas = 0;
  let conservadasDato = 0;

  for (const fila of filas) {
    if (fila.esDato && fila.familia !== undefined) {
      familiasEnFichero.add(fila.familia);
      if (fila.colorSap !== undefined) paresEnFichero.add(`${fila.familia}|${normalizeColor(fila.colorSap)}`);
    }
    if (!fila.esDato) {
      conservadas.push(fila.cruda);
    } else if (estaComprada(fila, compras)) {
      conservadas.push(fila.cruda);
      conservadasDato++;
    } else {
      retiradas++;
    }
  }

  // ¿Alguna compra no está en el fichero? (fichero incompleto respecto a lo comprado → se avisa)
  const traeColor = filas.some((f) => f.esDato && f.colorSap !== undefined);
  const compradoQueFalta = compras.filter((c) =>
    traeColor ? !paresEnFichero.has(`${c.familia}|${c.colorSap}`) : !familiasEnFichero.has(c.familia),
  );

  return { conservadas, conservadasDato, retiradas, compradoQueFalta };
}
