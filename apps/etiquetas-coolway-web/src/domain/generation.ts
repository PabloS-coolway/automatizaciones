import type { LabelVariant } from '@yorga/contracts';

/** Entrada del formulario de generación (modelo de dominio del front). */
export interface GenerationInput {
  master: File | null;
  orders: File[];
  market?: string;
  variant?: LabelVariant;
  importadoPor?: string;
}

/** Entrada ya validada (maestro garantizado). */
export interface ValidGenerationInput {
  master: File;
  orders: File[];
  market?: string;
  variant?: LabelVariant;
  importadoPor?: string;
}

/** Reglas de validación del dominio (puras, sin framework). */
export function validateGenerationInput(input: GenerationInput): string[] {
  const errors: string[] = [];
  if (!input.master) errors.push('Sube el Excel maestro (REFERENCIAS COOLWAY).');
  if (input.orders.length === 0) errors.push('Sube al menos un PDF de pedido de compra.');
  return errors;
}
