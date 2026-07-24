/**
 * REQ-010 · Fase 2 — Un surtido asignado a una referencia. `ref` es la ref color-a-color (7 dígitos, la
 * identidad); `surtido` es el código `SURTD` de SAP que se conserva al podar. Un surtido por referencia.
 */
export interface Surtido {
  ref: string;
  surtido: string;
}

/** Un dato inválido es culpa de quien lo manda (400), no un fallo del servidor: se dice qué pasa. */
export class SurtidoInvalidoError extends Error {}

/** Normaliza y valida el alta/edición. No se inventa: si la ref no es 7 dígitos o falta el código, se avisa. */
export function validateSurtido(input: { ref: string; surtido: string }): Surtido {
  const ref = String(input.ref ?? '').replace(/\D/g, '');
  if (ref.length !== 7) {
    throw new SurtidoInvalidoError(`La referencia "${input.ref}" no tiene 7 dígitos: no se puede asignar el surtido.`);
  }
  const surtido = String(input.surtido ?? '').trim();
  if (!surtido) throw new SurtidoInvalidoError('El código de surtido (SURTD) no puede quedar vacío.');
  return { ref, surtido };
}
