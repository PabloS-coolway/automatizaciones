import { LabelRow } from '../model/label';
import { PurchaseOrder } from '../model/order';
import { assortmentTotalPairs } from './assortment-catalog';

export interface Reconciliation {
  orderPairs: number;
  labelPairs: number;
  balanced: boolean;
  diff: number; // labelPairs - orderPairs
}

/**
 * RF-11 · Cuadre: Σ pares de la salida debe igualar Σ pares del pedido (cajas × pares/surtido).
 * Si no cuadra, se reporta el desfase en vez de fallar en silencio.
 */
export function reconcile(order: PurchaseOrder, rows: LabelRow[]): Reconciliation {
  const orderPairs = order.lines.reduce((sum, l) => sum + assortmentTotalPairs(l.assortment) * l.boxes, 0);
  const labelPairs = rows.reduce((sum, r) => sum + r.qty, 0);
  return { orderPairs, labelPairs, balanced: orderPairs === labelPairs, diff: labelPairs - orderPairs };
}
