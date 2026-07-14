import { Gender, Size } from '../model/types';

export interface AssortmentDef {
  /** Género que sugiere el surtido (informativo; el género autoritativo sale de la ref SAP). */
  gender: Gender;
  /** Pares por talla dentro de una caja del surtido. */
  pairs: Record<Size, number>;
}

/**
 * Catálogo de surtidos (PACK DETAIL del correo de Silvia, validado contra ficheros de bultos).
 * Externalizado como dato — si aparece un surtido nuevo, se añade aquí.
 */
export const ASSORTMENTS: Record<string, AssortmentDef> = {
  // Chica (ref 76)
  I: { gender: 'W', pairs: { '36': 1, '37': 2, '38': 3, '39': 3, '40': 2, '41': 1 } }, // 12
  KR: { gender: 'W', pairs: { '36': 1, '37': 1, '38': 2, '39': 2, '40': 1, '41': 1 } }, // 8
  DEI: { gender: 'W', pairs: { '37': 1, '38': 2, '39': 3, '40': 3, '41': 2, '42': 1 } }, // 12 · RN-03: 37–42
  D: { gender: 'W', pairs: { '36': 1, '37': 1, '38': 1, '39': 1 } }, // 4 · pedido 4603661
  E: { gender: 'W', pairs: { '37': 1, '38': 1, '39': 1, '40': 1 } }, // 4
  DE4: { gender: 'W', pairs: { '37': 1, '38': 2, '39': 1 } }, // 4 · pedido 4603661 (dobla la 38)
  L: { gender: 'W', pairs: { '37': 1, '38': 2, '39': 2, '40': 1 } }, // 6
  M: { gender: 'W', pairs: { '36': 1, '37': 1, '38': 2, '39': 1, '40': 1 } }, // 6
  N: { gender: 'W', pairs: { '37': 1, '38': 1, '39': 2, '40': 1, '41': 1 } }, // 6
  // Chico (ref 86)
  Z: { gender: 'M', pairs: { '40': 1, '41': 2, '42': 3, '43': 3, '44': 2, '45': 1 } }, // 12
  P: { gender: 'M', pairs: { '40': 1, '41': 1, '42': 2, '43': 2, '44': 1, '45': 1 } }, // 8
  GRZ: { gender: 'M', pairs: { '41': 1, '42': 2, '43': 3, '44': 3, '45': 2, '46': 1 } }, // 12
  CD: { gender: 'M', pairs: { '40': 1, '41': 1, '42': 1, '43': 1 } }, // 4 · pedido 4603661
  R: { gender: 'M', pairs: { '40': 1, '41': 1, '42': 2, '43': 1, '44': 1 } }, // 6
  S: { gender: 'M', pairs: { '41': 1, '42': 1, '43': 2, '44': 1, '45': 1 } }, // 6
  T: { gender: 'M', pairs: { '41': 1, '42': 2, '43': 2, '44': 1 } }, // 6
  Y: { gender: 'M', pairs: { '41': 1, '42': 1, '43': 1, '44': 1 } }, // 4
  S46: { gender: 'M', pairs: { '46': 1 } },
};

const PARES_SUELTOS = /^S(\d{2})$/;
const MONOTALLA = /^M(\d{2})$/;

/**
 * REQ-003 · Surtido de bolsas/mochilas/gorras: **1 unidad** de la talla `C01` (talla única).
 * Validado con los pedidos 4602991 (750 cajas = 750 pares) y 4602992 (250 = 250).
 * `C01` es a la vez el código de surtido y la TALLA SAP con la que se busca en el maestro.
 */
const TALLA_UNICA = /^C0\d$/;

/** Pares de una caja monotalla `M<nn>` (validado en el pedido 4603662: 448 líneas, siempre 6). */
const PARES_POR_CAJA_MONOTALLA = 6;

/** Un surtido que el catálogo no conoce. Se distingue para poder avisar con el código concreto. */
export class UnknownAssortmentError extends Error {
  constructor(readonly code: string) {
    super(`Surtido desconocido: "${code}"`);
    this.name = 'UnknownAssortmentError';
  }
}

/**
 * Devuelve la composición de un surtido:
 *  - `S<nn>` → 1 par suelto de la talla nn.
 *  - `M<nn>` → caja monotalla: 6 pares, todos de la talla nn (el género real sale de la ref SAP, RN-04).
 *  - resto   → catálogo `ASSORTMENTS`.
 *
 * Lanza si el código no se reconoce: mejor fallar que inventar un surtido y descuadrar el pedido.
 */
export function expandAssortment(code: string): AssortmentDef {
  const known = ASSORTMENTS[code];
  if (known) return known;

  const suelto = PARES_SUELTOS.exec(code);
  if (suelto) return { gender: 'W', pairs: { [suelto[1]]: 1 } };

  const mono = MONOTALLA.exec(code);
  if (mono) return { gender: 'W', pairs: { [mono[1]]: PARES_POR_CAJA_MONOTALLA } };

  // Bolsas/gorras: 1 unidad de talla única. La talla ES el propio código (`C01`).
  if (TALLA_UNICA.test(code)) return { gender: 'W', pairs: { [code]: 1 } };

  throw new UnknownAssortmentError(code);
}

/** Total de pares de una caja de ese surtido. */
export function assortmentTotalPairs(code: string): number {
  return Object.values(expandAssortment(code).pairs).reduce((a, b) => a + b, 0);
}
