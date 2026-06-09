import { MasterReference } from '../model/reference';
import { Gender, Size } from '../model/types';
import { genderFromRef } from './gender';

const key = (style: string, color: string, size: Size, gender: Gender) =>
  `${style.toUpperCase()}|${color.toUpperCase()}|${size}|${gender}`;

/**
 * Índice del maestro. Es la AUTORIDAD de códigos: solo se busca y se lee, nunca se inventa.
 * El género de cada fila se deduce del prefijo de su `ref` (76→W / 86→M).
 */
export class MasterIndex {
  private readonly byKey = new Map<string, MasterReference>();

  constructor(rows: MasterReference[]) {
    for (const row of rows) {
      const gender = genderFromRef(row.ref);
      this.byKey.set(key(row.style, row.color, row.size, gender), row);
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
