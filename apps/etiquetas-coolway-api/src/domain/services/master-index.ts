import { MasterReference } from '../model/reference';
import { Gender, Size } from '../model/types';
import { genderFromRef } from './gender';

const key = (style: string, color: string, size: Size, gender: Gender) =>
  `${style.toUpperCase()}|${color.toUpperCase()}|${size}|${gender}`;

/** La talla POR LA QUE SE BUSCA es la del PDF (talla SAP). En calzado coincide con la impresa. */
export const tallaDeBusqueda = (row: MasterReference): string => row.tallaSap || row.size;

/**
 * Cuántos códigos trae una fila (EAN13 + UPC). Sirve para desempatar cuando dos refs comparten clave:
 * gana la que más códigos tenga. A igualdad (misma cobertura), se conserva la primera — determinista.
 */
const codigos = (row: MasterReference): number => (row.ean13 ? 1 : 0) + (row.upc ? 1 : 0);

/**
 * Índice del maestro. Es la AUTORIDAD de códigos: solo se busca y se lee, nunca se inventa.
 * El género de cada fila se deduce del prefijo de su `ref` (76→W / 86→M).
 *
 * ⚠️ REQ-003 · Se indexa por la **talla SAP**, que es la que viene en el PDF del pedido. Indexar por
 * la talla impresa haría que la ropa no se encontrase nunca: el PDF dice `31` y el maestro guarda `S`.
 */
export class MasterIndex {
  private readonly byKey = new Map<string, MasterReference>();

  constructor(rows: MasterReference[]) {
    for (const row of rows) {
      const gender = genderFromRef(row.ref);
      const k = key(row.style, row.color, tallaDeBusqueda(row), gender);
      const prev = this.byKey.get(k);
      // Una misma clave puede llegar en varias refs: un producto re-referenciado en SAP conserva su
      // código en la ref vieja y en la nueva (misma identidad style+color+talla). Nos quedamos con la
      // fila MÁS COMPLETA —la que trae código— y NO dejamos que una ref vacía pise a una con EAN sólo
      // por entrar después. Antes se hacía `set()` a secas (last-write-wins) y la talla salía como
      // "faltante" aunque el código sí existía en la BD (BUG-005).
      if (!prev || codigos(row) > codigos(prev)) this.byKey.set(k, row);
    }
  }

  /** Busca la fila exacta por (style, color, size, género). */
  find(style: string, color: string, size: Size, gender: Gender): MasterReference | undefined {
    return this.byKey.get(key(style, color, size, gender));
  }

  /**
   * RN-05 · UPC con respaldo entre géneros: si la fila no tiene UPC (típico en tallas
   * solapadas 40-42 de la ref chica), se toma el de la ref del otro género (comparten UPC).
   */
  resolveUpc(style: string, color: string, size: Size, gender: Gender): string | undefined {
    const own = this.find(style, color, size, gender)?.upc;
    if (own) return own;
    const other: Gender = gender === 'W' ? 'M' : 'W';
    return this.find(style, color, size, other)?.upc;
  }

  get size(): number {
    return this.byKey.size;
  }
}
