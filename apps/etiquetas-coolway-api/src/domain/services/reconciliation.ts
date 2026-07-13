import { LabelRow } from '../model/label';
import { PurchaseOrder } from '../model/order';
import { assortmentTotalPairs } from './assortment-catalog';

export interface Reconciliation {
  orderPairs: number; // pares según lo que hemos LEÍDO del pedido (cajas × pares/surtido)
  labelPairs: number; // pares de las etiquetas generadas
  balanced: boolean; // etiquetas == lo leído del pedido
  diff: number; // labelPairs - orderPairs

  /** Lo que el PROPIO PDF declara al pie. undefined si el pie no se reconoció. */
  declaredPairs?: number;
  declaredBoxes?: number;
  parsedBoxes: number;
  /**
   * ¿Lo que hemos leído coincide con lo que el PDF dice que hay?
   * `false` significa que el parser se ha dejado líneas: las etiquetas saldrían INCOMPLETAS.
   * true cuando no hay totales declarados (no se puede comprobar → no se acusa en falso).
   */
  matchesDeclared: boolean;
  /** Pares que el PDF declara y nosotros no hemos visto (0 si cuadra o no hay declarado). */
  missedPairs: number;
}

/**
 * RF-11 · Cuadre. Dos comprobaciones distintas, y hacen falta las dos:
 *
 *  1. `balanced` — las etiquetas cuadran con el pedido leído. OJO: es CIRCULAR (ambos lados salen
 *     del mismo catálogo de surtidos), así que por sí solo NO detecta líneas perdidas.
 *  2. `matchesDeclared` — lo leído cuadra con el total que el PDF declara al pie. Ésta es la buena:
 *     es la única fuente independiente. Sin ella, un fallo del parser pasaba desapercibido
 *     (pedido 4603662: 37 líneas ignoradas por un color con guión → 798 pares de menos, "cuadrando").
 */
export function reconcile(order: PurchaseOrder, rows: LabelRow[]): Reconciliation {
  const orderPairs = order.lines.reduce((sum, l) => sum + assortmentTotalPairs(l.assortment) * l.boxes, 0);
  const labelPairs = rows.reduce((sum, r) => sum + r.qty, 0);
  const parsedBoxes = order.lines.reduce((sum, l) => sum + l.boxes, 0);

  const declaredPairs = order.declared?.pairs;
  const matchesDeclared = declaredPairs === undefined || declaredPairs === orderPairs;
  const missedPairs = declaredPairs === undefined ? 0 : Math.max(0, declaredPairs - orderPairs);

  return {
    orderPairs,
    labelPairs,
    balanced: orderPairs === labelPairs,
    diff: labelPairs - orderPairs,
    declaredPairs,
    declaredBoxes: order.declared?.boxes,
    parsedBoxes,
    matchesDeclared,
    missedPairs,
  };
}
