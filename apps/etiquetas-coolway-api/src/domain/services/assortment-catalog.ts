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
  E: { gender: 'W', pairs: { '37': 1, '38': 1, '39': 1, '40': 1 } }, // 4
  L: { gender: 'W', pairs: { '37': 1, '38': 2, '39': 2, '40': 1 } }, // 6
  M: { gender: 'W', pairs: { '36': 1, '37': 1, '38': 2, '39': 1, '40': 1 } }, // 6
  N: { gender: 'W', pairs: { '37': 1, '38': 1, '39': 2, '40': 1, '41': 1 } }, // 6
  // Chico (ref 86)
  Z: { gender: 'M', pairs: { '40': 1, '41': 2, '42': 3, '43': 3, '44': 2, '45': 1 } }, // 12
  P: { gender: 'M', pairs: { '40': 1, '41': 1, '42': 2, '43': 2, '44': 1, '45': 1 } }, // 8
  GRZ: { gender: 'M', pairs: { '41': 1, '42': 2, '43': 3, '44': 3, '45': 2, '46': 1 } }, // 12
  R: { gender: 'M', pairs: { '40': 1, '41': 1, '42': 2, '43': 1, '44': 1 } }, // 6
  S: { gender: 'M', pairs: { '41': 1, '42': 1, '43': 2, '44': 1, '45': 1 } }, // 6
  T: { gender: 'M', pairs: { '41': 1, '42': 2, '43': 2, '44': 1 } }, // 6
  Y: { gender: 'M', pairs: { '41': 1, '42': 1, '43': 1, '44': 1 } }, // 4
  S46: { gender: 'M', pairs: { '46': 1 } },
};

const PARES_SUELTOS = /^S(\d{2})$/;

/**
 * Devuelve la composición de un surtido. Para pares sueltos `S<nn>` → 1 par en la talla nn.
 * Lanza si el código no se reconoce (mejor fallar que inventar).
 */
export function expandAssortment(code: string): AssortmentDef {
  const known = ASSORTMENTS[code];
  if (known) return known;

  const m = PARES_SUELTOS.exec(code);
  if (m) return { gender: 'W', pairs: { [m[1]]: 1 } };

  throw new Error(`Surtido desconocido: "${code}"`);
}

/** Total de pares de una caja de ese surtido. */
export function assortmentTotalPairs(code: string): number {
  return Object.values(expandAssortment(code).pairs).reduce((a, b) => a + b, 0);
}
