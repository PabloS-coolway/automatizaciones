import { familiaDeRef, normalizeColor } from './familia';

/** REQ-010 · Sociedades del grupo. El código es lo que va en el fichero de SAP. */
export const SOCIEDAD_CODES = ['2000', '4000'] as const;
export type SociedadCodigo = (typeof SOCIEDAD_CODES)[number];

export function esSociedad(v: string): v is SociedadCodigo {
  return (SOCIEDAD_CODES as readonly string[]).includes(v);
}

/**
 * REQ-010 · Fase 1 — reescribe el código de sociedad en las columnas indicadas de una línea TSV, para poder
 * elegir la sociedad al podar (todos los ficheros salen con la `2000`). **Defensivo (regla "no falla,
 * miente"):** SÓLO reescribe una columna que **ya contiene** un código de sociedad conocido; si la columna no
 * lo trae (el índice no era el de la sociedad para este fichero), NO la toca y lo marca `sospechosa`, para
 * no subir a SAP un fichero corrupto en silencio. Devuelve la línea (posiblemente reescrita) y si se aplicó.
 */
export function reescribirSociedadLinea(
  cruda: string,
  cols: number[],
  sociedad: SociedadCodigo,
): { linea: string; aplicada: boolean; sospechosa: boolean } {
  if (cols.length === 0) return { linea: cruda, aplicada: false, sospechosa: false };
  const campos = cruda.split('\t');
  let aplicada = false;
  let sospechosa = false;
  for (const col of cols) {
    if (esSociedad((campos[col] ?? '').trim())) {
      campos[col] = sociedad;
      aplicada = true;
    } else {
      sospechosa = true; // la columna esperada no traía una sociedad → no se toca, se avisa
    }
  }
  return { linea: campos.join('\t'), aplicada, sospechosa };
}

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
  /** REQ-010 · El código de surtido (`SURTD`), sólo en el fichero de surtidos. Para el filtro por asignación. */
  surtido?: string;
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

/**
 * BUG-006 · Refs COMPRADAS cuyo color (Horma) viene **vacío** en el borrador. Sin el código de color no
 * se pueden cruzar contra los ficheros con color (materiales/surtidos): quedarían anuladas y —peor— el
 * sistema lo reportaría como "no aparece en el fichero" (parece fichero incompleto) cuando en realidad
 * **falta el color en el borrador**. Se detectan aparte para AVISAR con claridad (no mentir).
 */
export function comprasSinColor(lineas: LineaBorrador[]): string[] {
  const refs: string[] = [];
  const vistas = new Set<string>();
  for (const l of lineas) {
    if (!(l.suma > 0)) continue;
    if (normalizeColor(l.colorSap) !== '') continue;
    const ref = String(l.ourRef ?? '').trim();
    if (ref && !vistas.has(ref)) {
      vistas.add(ref);
      refs.push(ref);
    }
  }
  return refs;
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
  // BUG-006 · en ficheros CON color, una compra sin color (Horma vacía en el borrador) NO es "falta en el
  // fichero": es un problema del borrador que se reporta aparte (`comprasSinColor`). No se cuela aquí para
  // que este aviso siga significando exactamente "el fichero de SAP venía incompleto".
  const traeColor = filas.some((f) => f.esDato && f.colorSap !== undefined);
  const compradoQueFalta = compras.filter((c) =>
    traeColor
      ? c.colorSap !== '' && !paresEnFichero.has(`${c.familia}|${c.colorSap}`)
      : !familiasEnFichero.has(c.familia),
  );

  return { conservadas, conservadasDato, retiradas, compradoQueFalta };
}

/** Resultado de la poda de surtidos: como el normal, más cuántas líneas se GENERARON por catálogo. */
export interface ResultadoPodaSurtidos extends ResultadoPoda {
  /** Líneas de surtido añadidas por expansión del catálogo (para el informe: el fichero crece a propósito). */
  generadas: number;
}

/**
 * REQ-011 (corrección) · Poda del **fichero de surtidos** por EXPANSIÓN al catálogo, no por filtro.
 *
 * Para cada producto **comprado** `(familia, color)`, la salida lleva **todos** los códigos SURTD del catálogo
 * de su grupo (prefijo 76/86…), estén o no en el fichero de entrada — que era justo lo que faltaba. Cada línea
 * generada es un **clon de una línea real de ese mismo producto** con el campo SURTD reescrito (vía
 * `reescribirSurtido`): así el proveedor, nombre, modelo y color salen de datos que ya existían — **no se
 * inventa nada** (regla del proyecto).
 *
 * Salvaguardas ("¿cómo me entero si miente?"):
 * - Producto comprado que **no aparece** en el fichero → no hay línea que clonar → **no se genera**; se avisa
 *   en `compradoQueFalta` (nunca se compone de cero).
 * - Grupo **sin catálogo** → ese producto se deja **tal cual** (opt-in por grupo; no se vacía en silencio).
 * - Un producto **no comprado** se retira (poda normal).
 */
export function podarSurtidos(
  filas: FilaSap[],
  compras: Compra[],
  catalogoPorGrupo: Map<string, string[]>,
  reescribirSurtido: (cruda: string, codigo: string) => string,
): ResultadoPodaSurtidos {
  const conservadas: string[] = [];
  const paresEnFichero = new Set<string>();
  let retiradas = 0;
  let conservadasDato = 0;
  let generadas = 0;
  // Estado por producto (familia|color): 'expandido' (ya emitido su set de catálogo) u 'original' (se conserva tal cual).
  const procesado = new Map<string, 'expandido' | 'original'>();

  for (const fila of filas) {
    if (!fila.esDato || fila.familia === undefined) {
      conservadas.push(fila.cruda); // cabeceras y líneas sin familia se conservan intactas
      continue;
    }
    const color = fila.colorSap === undefined ? '' : normalizeColor(fila.colorSap);
    const clave = `${fila.familia}|${color}`;
    if (fila.colorSap !== undefined) paresEnFichero.add(clave);

    if (!estaComprada(fila, compras)) {
      retiradas++;
      continue;
    }

    const estado = procesado.get(clave);
    if (estado === 'expandido') continue; // línea original ya sustituida por la expansión del catálogo
    if (estado === 'original') {
      conservadas.push(fila.cruda);
      conservadasDato++;
      continue;
    }

    // Primera línea de este producto comprado: se decide una vez.
    const codigos = catalogoPorGrupo.get(fila.familia.slice(0, 2));
    if (codigos && codigos.length > 0) {
      for (const cod of codigos) {
        conservadas.push(reescribirSurtido(fila.cruda, cod));
        conservadasDato++;
        generadas++;
      }
      procesado.set(clave, 'expandido');
    } else {
      conservadas.push(fila.cruda);
      conservadasDato++;
      procesado.set(clave, 'original');
    }
  }

  const compradoQueFalta = compras.filter((c) => c.colorSap !== '' && !paresEnFichero.has(`${c.familia}|${c.colorSap}`));
  return { conservadas, conservadasDato, retiradas, compradoQueFalta, generadas };
}
