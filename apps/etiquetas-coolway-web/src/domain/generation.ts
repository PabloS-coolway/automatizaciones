import type { LabelVariant, MasterSourceKind } from '@yorga/contracts';

/** Entrada del formulario de generación (modelo de dominio del front). */
export interface GenerationInput {
  masterSource: MasterSourceKind; // 'db' (Postgres) o 'file' (Excel subido)
  master: File | null;
  orders: File[];
  market?: string;
  variant?: LabelVariant;
  importadoPor?: string;
}

/** Entrada ya validada. */
export interface ValidGenerationInput {
  masterSource: MasterSourceKind;
  master: File | null; // requerido solo si masterSource === 'file'
  orders: File[];
  market?: string;
  variant?: LabelVariant;
  importadoPor?: string;
}

/** Reglas de validación del dominio (puras, sin framework). */
export function validateGenerationInput(input: GenerationInput): string[] {
  const errors: string[] = [];
  if (input.masterSource === 'file' && !input.master) errors.push('Sube el Excel maestro (o usa la base de datos).');
  if (input.orders.length === 0) errors.push('Sube al menos un PDF de pedido de compra.');
  return errors;
}
