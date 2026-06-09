/**
 * RN-02 · CODE128 = referencia YORGA + "00000" + talla.
 * Validado con datos reales: 7623425 + 00000 + 36 = 76234250000036; 8623832 + ... + 40 = 86238320000040.
 */
export function buildCode128(ref: string, size: string): string {
  return `${ref}00000${size}`;
}
