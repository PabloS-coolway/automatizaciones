import { LABEL_VARIANTS, LabelVariant } from '@yorga/contracts';

/**
 * REQ-004 · Un destino de pedido. Decide qué códigos lleva la etiqueta y el "importado por" que se
 * imprime (RF-13/RF-14). Es una decisión COMERCIAL de Yorga, y por eso la gobierna Silvia desde la web.
 */
export interface Destination {
  code: string;
  name: string;
  variant: LabelVariant;
  importadoPor: string;
  active: boolean;
}

export type DestinationInput = {
  code?: string;
  name?: string;
  variant?: string;
  importadoPor?: string;
};

/** Un dato del destino que no vale, con el porqué en lenguaje del usuario. */
export class InvalidDestinationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidDestinationError';
  }
}

/** El código es el identificador: se normaliza para que "usa" y "USA" sean el mismo destino. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, '_');
}

/**
 * Valida y normaliza un destino nuevo.
 *
 * ⚠️ La **variante NO es texto libre**: sólo valen las que el motor sabe construir (EAN, UPC,
 * CODE128_EAN, UPC_EAN). Si se aceptara cualquier texto, se podría guardar un destino que al generar
 * no imprimiera nada — o peor, que fallara en mitad de un pedido. Una variante nueva implica saber qué
 * códigos imprimir: eso es desarrollo, no configuración.
 */
export function validateNewDestination(input: DestinationInput): Omit<Destination, 'active'> {
  const code = normalizeCode(input.code ?? '');
  if (!code) throw new InvalidDestinationError('El código del destino es obligatorio (p.ej. USA, COSTA_RICA).');
  if (!/^[A-Z0-9_]+$/.test(code)) {
    throw new InvalidDestinationError(
      `El código "${code}" sólo puede llevar letras, números y guión bajo (p.ej. COSTA_RICA).`,
    );
  }

  const name = (input.name ?? '').trim();
  if (!name) throw new InvalidDestinationError('El nombre es obligatorio (es lo que se ve en el desplegable).');

  const importadoPor = (input.importadoPor ?? '').trim();
  if (!importadoPor) {
    throw new InvalidDestinationError('El "importado por" es obligatorio: es el texto que se imprime en la etiqueta.');
  }

  return { code, name, variant: validateVariant(input.variant), importadoPor };
}

/** La variante debe ser una de las que el motor sabe construir. */
export function validateVariant(variant: string | undefined): LabelVariant {
  if (!variant || !LABEL_VARIANTS.includes(variant as LabelVariant)) {
    throw new InvalidDestinationError(
      `La variante "${variant ?? ''}" no existe. Válidas: ${LABEL_VARIANTS.join(', ')}. ` +
        `Son las combinaciones de códigos que la herramienta sabe imprimir.`,
    );
  }
  return variant as LabelVariant;
}
