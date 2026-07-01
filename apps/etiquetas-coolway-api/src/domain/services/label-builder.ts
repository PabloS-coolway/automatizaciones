import { LabelRow, MissingCode } from '../model/label';
import { PurchaseOrder } from '../model/order';
import { LabelVariant } from '../model/types';
import { expandAssortment } from './assortment-catalog';
import { buildCode128 } from './code128';
import { genderFromRef } from './gender';
import { MasterIndex } from './master-index';

export interface BuildResult {
  rows: LabelRow[];
  missing: MissingCode[];
}

const needsEan = (v: LabelVariant) => v === 'EAN' || v === 'CODE128_EAN' || v === 'UPC_EAN';
const needsUpc = (v: LabelVariant) => v === 'UPC' || v === 'UPC_EAN';
const needsCode128 = (v: LabelVariant) => v === 'CODE128_EAN';

/**
 * Construye las filas de etiqueta a partir del pedido + maestro.
 * - QTY = pares por talla del surtido × cajas (RF-03).
 * - Dedupe por (ref, talla) sumando QTY (RN-06); NUNCA fusiona entre géneros 76/86.
 * - Lee EAN13/UPC del maestro (RD-02); compone CODE128 (RN-02) y SKU si falta (RF-08).
 * - Reporta lo que falte en el maestro en vez de inventarlo (RF-12).
 */
export function buildLabels(
  order: PurchaseOrder,
  master: MasterIndex,
  variant: LabelVariant,
  importadoPor?: string,
): BuildResult {
  const acc = new Map<string, LabelRow>(); // clave: ref|talla
  const missing: MissingCode[] = [];

  for (const line of order.lines) {
    const gender = genderFromRef(line.refSap);
    const def = expandAssortment(line.assortment);

    for (const [size, perBox] of Object.entries(def.pairs)) {
      const qty = perBox * line.boxes;
      if (qty === 0) continue;

      const row = master.find(line.style, line.color, size, gender);
      if (!row) {
        missing.push({ style: line.style, color: line.color, size, qty, reason: 'no_master_row' });
        continue;
      }

      const ean13 = row.ean13;
      const upc = master.resolveUpc(line.style, line.color, size, gender);
      if (needsEan(variant) && !ean13) {
        missing.push({ style: line.style, color: line.color, size, qty, ref: row.ref, reason: 'missing_ean13' });
      }
      if (needsUpc(variant) && !upc) {
        missing.push({ style: line.style, color: line.color, size, qty, ref: row.ref, reason: 'missing_upc' });
      }

      const dedupeKey = `${row.ref}|${size}`;
      const existing = acc.get(dedupeKey);
      if (existing) {
        existing.qty += qty; // RN-06: misma (ref, talla) en dos surtidos → suma
        continue;
      }

      acc.set(dedupeKey, {
        style: line.style,
        color: line.color,
        ref: row.ref,
        size,
        sku: row.sku || `${row.ref}-${size}`, // RF-08: componer sólo si falta (no acuñar)
        qty,
        ean13: needsEan(variant) ? ean13 : undefined,
        upc: needsUpc(variant) ? upc : undefined,
        code128: needsCode128(variant) ? buildCode128(row.ref, size) : undefined,
        importadoPor,
      });
    }
  }

  return { rows: sortRows([...acc.values()]), missing };
}

/** Orden de salida (RF-10): primero refs 76, luego 86; dentro, por style, color, ref, talla. */
function sortRows(rows: LabelRow[]): LabelRow[] {
  return rows.sort(
    (a, b) =>
      genderRank(a.ref) - genderRank(b.ref) ||
      a.style.localeCompare(b.style) ||
      a.color.localeCompare(b.color) ||
      a.ref.localeCompare(b.ref) ||
      Number(a.size) - Number(b.size),
  );
}

const genderRank = (ref: string) => (ref.startsWith('86') ? 1 : 0);
