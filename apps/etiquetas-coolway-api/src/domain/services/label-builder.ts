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

/**
 * Modelos que el negocio ha decidido NO etiquetar. Hoy NINGUNO: `BACKPACK` estuvo excluido un tiempo
 * ("no se vende"), pero Silvia confirmó que los pedidos 4602991/4602992 SÍ se etiquetan, así que
 * volvió a entrar. El mecanismo se mantiene por si vuelve a hacer falta: un modelo excluido no se
 * etiqueta pero se REPORTA (nunca desaparece en silencio). Exportado para poder testearlo.
 */
export const MODELOS_EXCLUIDOS = new Set<string>();

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

    // `tallaSap` es la que trae el PDF (40 en calzado, 31 en ropa, C01 en bolsas).
    for (const [tallaSap, perBox] of Object.entries(def.pairs)) {
      const qty = perBox * line.boxes;
      if (qty === 0) continue;

      // Decisión de negocio (Silvia): este modelo no se vende y no se etiqueta. Se REPORTA,
      // no se descarta en silencio: el pedido no sale entero y hay que saberlo.
      if (MODELOS_EXCLUIDOS.has(line.style.toUpperCase())) {
        missing.push({ style: line.style, color: line.color, size: tallaSap, qty, reason: 'excluded_model' });
        continue;
      }

      const row = master.find(line.style, line.color, tallaSap, gender);
      if (!row) {
        missing.push({ style: line.style, color: line.color, size: tallaSap, qty, reason: 'no_master_row' });
        continue;
      }

      // REQ-003 · Las tres tallas: se busca por la del PDF, se IMPRIME la del maestro y el código
      // de barras lleva la de tiendas. En calzado las tres son la misma y esto no cambia nada.
      const size = row.size;
      const tallaTiendas = row.tallaTiendas || row.size;

      const ean13 = row.ean13;
      const upc = master.resolveUpc(line.style, line.color, tallaSap, gender);
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

      const conversion = tallaSap !== size || tallaTiendas !== size; // en calzado, las tres son la misma
      acc.set(dedupeKey, {
        style: line.style,
        color: line.color,
        ref: row.ref,
        size,
        tallaSap: conversion ? tallaSap : undefined,
        tallaTiendas: conversion ? tallaTiendas : undefined,
        sku: row.sku || `${row.ref}-${size}`, // RF-08: componer sólo si falta (no acuñar)
        qty,
        ean13: needsEan(variant) ? ean13 : undefined,
        upc: needsUpc(variant) ? upc : undefined,
        code128: needsCode128(variant) ? buildCode128(row.ref, tallaTiendas) : undefined,
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
      compararTallas(a.size, b.size),
  );
}

/**
 * Las tallas de calzado son números (36 < 40) pero las de ropa no (S, M, L, XL). Comparar con
 * `Number()` daba `NaN` y dejaba el orden al azar. Se ordenan como números cuando lo son, y por el
 * orden natural de la ropa cuando no.
 */
const ORDEN_ROPA = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'U'];

function compararTallas(a: string, b: string): number {
  const na = Number(a);
  const nb = Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;

  const ia = ORDEN_ROPA.indexOf(a.toUpperCase());
  const ib = ORDEN_ROPA.indexOf(b.toUpperCase());
  if (ia !== -1 && ib !== -1) return ia - ib;

  return a.localeCompare(b, 'es', { numeric: true }); // 36-38 < 39-41 < 42-45
}

const genderRank = (ref: string) => (ref.startsWith('86') ? 1 : 0);
