/**
 * REQ-005 · La ref de FAMILIA que va a SAP se obtiene de la ref color-a-color del borrador (7 dígitos)
 * **poniendo el 3º dígito a 0 y añadiendo un 0 al final** (regla confirmada por Silvia, 21/07). El 3º dígito
 * es el que codifica el color, así que todos los colores de una misma ref caen en la misma familia.
 *
 *   7613425 (BGE) → 7603425 → 76034250     ·     8693832 (DGY chico) → 8603832 → 86038320
 *
 * ⚠️ Defensivo (regla del proyecto "no falla, miente"): si la ref no tiene el formato esperado, se AVISA
 * (excepción) en vez de devolver una familia inventada que descuadraría la poda en silencio.
 */
export class RefInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefInvalidaError';
  }
}

/** Normaliza una ref del borrador: quita todo lo que no sea dígito (Excel a veces mete comillas/espacios). */
export function normalizeRef(ref: string): string {
  return String(ref ?? '').replace(/\D/g, '');
}

/** Ref color-a-color (7 dígitos) → ref de familia (8 dígitos). Ver regla arriba. */
export function familiaDeRef(refColor: string): string {
  const ref = normalizeRef(refColor);
  if (ref.length !== 7) {
    throw new RefInvalidaError(
      `La referencia "${refColor}" no tiene 7 dígitos (tiene ${ref.length}): no se puede calcular su familia con seguridad.`,
    );
  }
  // 3º dígito (índice 2) a 0, y un 0 al final.
  return ref.slice(0, 2) + '0' + ref.slice(3) + '0';
}

/**
 * Normaliza un código de color de SAP (3 dígitos). En el borrador, el `Horma` a veces llega como `"001`
 * (marca de texto de Excel); en los ficheros de SAP viene `001`. Se comparan por su valor de 3 dígitos.
 */
export function normalizeColor(color: string | number): string {
  const digits = String(color ?? '').replace(/\D/g, '');
  return digits ? digits.padStart(3, '0') : '';
}
