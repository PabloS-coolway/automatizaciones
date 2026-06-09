import { OrderLine, PurchaseOrder } from '../../domain/model/order';

/**
 * Parser PURO del texto (layout) de un pedido de compra SAP → PurchaseOrder.
 * Separado del extractor de PDF para poder testearlo con un fixture.
 *
 * ⚠️ Ajustado a la estructura del PDF 4603418 (pares sueltos). Endurecer cuando Silvia
 * confirme que el formato es estable y nos pase más muestras (DEP-A6 / pregunta 6).
 *
 * Estructura por ítem (2 líneas):
 *   "  1 NILO   NILO MARRON S36 Surtido   BRW   4   S36   1   35/42 ...""
 *   "           76033980200S36            total   4"
 */
const HEADER = /^(\d+)\s+(\S+)$/; // "1 NILO" → nº línea + style
const REF_SAP = /^\d{7,}[A-Z0-9]*$/; // "76033980200S36"

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

    const header = HEADER.exec(cols[0]);
    if (header && cols.length >= 4) {
      const style = header[2];
      const colorIdx = cols.findIndex((c, i) => i >= 1 && /^[A-Z]{2,4}$/.test(c) && c !== style);
      const boxesIdx = cols.findIndex((c, i) => i > colorIdx && /^\d+$/.test(c));
      if (colorIdx === -1 || boxesIdx === -1) continue;

      pending = {
        style,
        color: cols[colorIdx],
        boxes: Number(cols[boxesIdx]),
        assortment: cols[boxesIdx + 1] ?? '',
      };
      continue;
    }

    if (pending && REF_SAP.test(cols[0])) {
      const totalIdx = cols.indexOf('total');
      const boxes = totalIdx !== -1 ? Number(cols[totalIdx + 1]) : pending.boxes;
      items.push({ ...pending, refSap: cols[0], boxes });
      pending = null;
    }
  }

  return { orderNumber, lines: items };
}
