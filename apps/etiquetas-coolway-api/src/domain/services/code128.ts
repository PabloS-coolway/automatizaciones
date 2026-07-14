/**
 * RN-02 · CODE128 = referencia YORGA + "00000" + talla.
 * Validado con datos reales: 7623425 + 00000 + 36 = 76234250000036; 8623832 + ... + 40 = 86238320000040.
 *
 * ⚠️ REQ-003 · Dos matices que sólo aparecen fuera del calzado:
 *
 *  1. **La referencia se rellena con ceros por la izquierda hasta 7 dígitos** (regla de Silvia:
 *     *"las referencias que tengan un dígito menos deben añadir un cero delante"*). La mochila
 *     `308280` pasa a `0308280`. Lo confirma el propio SAP: en el PDF, su ref ya viene como
 *     `03082800000C01`.
 *  2. **La talla que entra aquí es la TALLA TIENDAS**, no la que se imprime. En ropa la etiqueta
 *     dice `S` pero el código lleva `11`. Meter la talla impresa daría un código inválido
 *     (`...0000S`): una etiqueta inservible.
 */
const LARGO_REF = 7;

export function buildCode128(ref: string, tallaTiendas: string): string {
  return `${ref.padStart(LARGO_REF, '0')}00000${tallaTiendas}`;
}
