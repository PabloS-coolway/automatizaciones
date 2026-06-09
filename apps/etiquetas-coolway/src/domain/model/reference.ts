import { z } from 'zod';

/**
 * Fila del maestro `REFERENCIAS COOLWAY` (la fuente de verdad de códigos).
 * Clave natural de búsqueda: (style, color, size, género) — ver RD-01/RN-01.
 * `ref` se LEE fila a fila (puede variar por talla dentro de un color) y NUNCA se reconstruye.
 */
export const MasterReferenceSchema = z.object({
  style: z.string().min(1),
  color: z.string().min(1),
  ref: z.string().min(1),
  size: z.string().min(1),
  ean13: z.string().optional(),
  upc: z.string().optional(),
  sku: z.string().optional(),
  colorNameWeb: z.string().optional(),
});

export type MasterReference = z.infer<typeof MasterReferenceSchema>;
