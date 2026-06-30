import { OrderLine, PurchaseOrder } from '../../domain/model/order';

/**
 * Parser PURO del texto (layout) de un pedido de compra SAP → PurchaseOrder.
 * Separado del extractor de PDF para poder testearlo con un fixture.
 *
 * ⚠️ Ajustado a la estructura del PDF 4603418 (pares sueltos). Endurecer cuando Silvia
 * confirme que el formato es estable y nos pase más muestras (DEP-A6 / pregunta 6).
 *
 * Estructura por ítem (2 líneas): la cabecera da style/color; la línea de ref SAP
 * da la referencia, el surtido (sufijo de letras de la ref) y las cajas ("total N").
 *   "  1 GOAL  GOAL MARRON-OSCURO 00I  DBR  10  00I  12  35/42 1 2 3 3 2 1 ...""
 *   "           7603298020100I         total  10"
 * Pares sueltos: ref "76033980200S36" → surtido "S36".
 */
const REF_SAP = /^\d{11,}[A-Z0-9]*$/; // "7603298020100I" (≥11 díg.; evita el nº de pedido de 7)
const ASSORTMENT_SUFFIX = /[A-Z][A-Z0-9]*$/; // surtido al final de la ref SAP
const COLOR = /^[A-Z]{2,4}$/; // código de color aislado (DBR, MOC, COG…)
const STYLE = /^[A-Z0-9][A-Z0-9 -]+$/; // style alfanumérico, admite varias palabras (GOAL EDGE); descarta fechas/monedas

const splitCols = (line: string): string[] =>
  line
    .split(/\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);

export function parseSapOrderText(text: string, orderNumberHint?: string): PurchaseOrder {
  const lines = text.split(/\r?\n/);
  const orderNumber = orderNumberHint ?? text.match(/\b(4\d{6})\b/)?.[1] ?? 'UNKNOWN';

  const items: OrderLine[] = [];
  let pending: Omit<OrderLine, 'refSap'> | null = null;

  for (const line of lines) {
    const cols = splitCols(line);
    if (cols.length === 0) continue;

    // 1) Línea de ref SAP (la más fiable): cierra el ítem pendiente.
    //    Da la referencia, el surtido (sufijo de la ref) y las cajas ("total N").
    const totalIdx = cols.indexOf('total');
    if (pending && totalIdx !== -1 && REF_SAP.test(cols[0])) {
      const refSap = cols[0];
      const boxes = Number(cols[totalIdx + 1]);
      const assortment = refSap.match(ASSORTMENT_SUFFIX)?.[0] ?? pending.assortment;
      items.push({ ...pending, refSap, assortment, boxes });
      pending = null;
      continue;
    }

    // 2) Cabecera de ítem: detectada por color (2-4 mayúsc) + cajas (entero) después.
    //    NO depende del nº de línea: en pedidos largos los nº de 2 dígitos saltan a otra línea
    //    y la fila del ítem empieza directamente por el style.
    const colorIdx = cols.findIndex((c, i) => i >= 1 && COLOR.test(c));
    const boxesIdx = colorIdx >= 1 ? cols.findIndex((c, i) => i > colorIdx && /^\d+$/.test(c)) : -1;
    if (colorIdx >= 1 && boxesIdx > colorIdx) {
      // Quita solo el nº de línea inicial y conserva el estilo completo (incluido multi-palabra: "GOAL EDGE").
      const style = cols[0].replace(/^\d+\s+/, '').trim();
      // El style es alfanumérico (GOAL, NILO, 2003, GOAL EDGE…); descarta filas meta como fechas (01.06.2026) o monedas.
      if (STYLE.test(style)) {
        pending = { style, color: cols[colorIdx], boxes: Number(cols[boxesIdx]), assortment: cols[boxesIdx + 1] ?? '' };
      }
    }
  }

  return { orderNumber, lines: items };
}
