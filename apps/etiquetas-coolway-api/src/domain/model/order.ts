import { z } from 'zod';

/**
 * Línea de un pedido de compra de SAP (extraída del PDF).
 * `refSap` ej. "76033980200S36" — su prefijo (76/86) da el género; el resto identifica la línea.
 * `assortment` ej. "I","KR","DEI","Z","P","S46","GRZ" (cajas surtidas) o "S36" (pares sueltos).
 */
export const OrderLineSchema = z.object({
  style: z.string().min(1),
  color: z.string().min(1),
  refSap: z.string().min(1),
  assortment: z.string().min(1),
  boxes: z.number().int().nonnegative(),
});

export type OrderLine = z.infer<typeof OrderLineSchema>;

/**
 * Totales que el PROPIO PDF declara al pie ("TOTAL BOXES" / "TOTAL PAIRS").
 * Son la única fuente independiente de nuestro parser: sirven para comprobar que no nos hemos
 * dejado ninguna línea. Opcional: si el pie no se reconoce, no se inventa.
 */
export const OrderTotalsSchema = z.object({
  boxes: z.number().int().nonnegative(),
  pairs: z.number().int().nonnegative(),
});

export type OrderTotals = z.infer<typeof OrderTotalsSchema>;

export const PurchaseOrderSchema = z.object({
  orderNumber: z.string().min(1),
  lines: z.array(OrderLineSchema),
  declared: OrderTotalsSchema.optional(),
});

export type PurchaseOrder = z.infer<typeof PurchaseOrderSchema>;
