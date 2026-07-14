import { z } from 'zod';

/**
 * Fila del maestro `REFERENCIAS COOLWAY` (la fuente de verdad de códigos).
 * `ref` se LEE fila a fila (puede variar por talla dentro de un color) y NUNCA se reconstruye.
 *
 * ⚠️ REQ-003 · Un SKU tiene hasta TRES tallas, y confundirlas imprime el código de barras de otro
 * producto. En calzado las tres coinciden; en ropa, calcetines y bolsas NO:
 *
 *   | familia      | tallaSap (viene en el PDF) | tallaTiendas (va al código) | size (se imprime) |
 *   |--------------|----------------------------|-----------------------------|-------------------|
 *   | calzado      | 40                         | 40                          | 40                |
 *   | ropa         | 31                         | 11                          | S                 |
 *   | calcetines   | 31                         | 11                          | 36-38             |
 *   | bolsas       | C01                        | 35                          | U                 |
 *
 * La traducción NO se calcula: se LEE del maestro, fila a fila. `tallaSap` y `tallaTiendas` son
 * opcionales — si no vienen, es calzado y valen lo mismo que `size`.
 */
export const MasterReferenceSchema = z.object({
  style: z.string().min(1),
  color: z.string().min(1),
  ref: z.string().min(1),
  /** La que se IMPRIME en la etiqueta (40 · S · 36-38 · U). */
  size: z.string().min(1),
  /** La que viene en el PDF del pedido. Si falta, es `size` (calzado). */
  tallaSap: z.string().optional(),
  /** La que va al CÓDIGO DE BARRAS. Si falta, es `size` (calzado). */
  tallaTiendas: z.string().optional(),
  ean13: z.string().optional(),
  upc: z.string().optional(),
  sku: z.string().optional(),
  colorNameWeb: z.string().optional(),
});

export type MasterReference = z.infer<typeof MasterReferenceSchema>;
