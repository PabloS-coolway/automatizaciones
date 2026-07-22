import { ReferenceRepository } from './ports';

/**
 * REQ-009 · Costura para el log de actividad (REQ-007). Es OPCIONAL hasta que REQ-007 aterrice en main:
 * el use-case ya calcula el antes→después y lo deja preparado; cuando exista el recorder, se inyecta y
 * el rastro queda solo. No se implementa aquí el contrato final de REQ-007 para no adivinarlo.
 */
export interface ActivityRecorder {
  record(entry: {
    actor: string;
    entity: string;
    action: 'create' | 'update' | 'delete';
    entityId: string;
    before: unknown;
    after: unknown;
    summary: string;
  }): Promise<void>;
}

export interface EditarColorWebInput {
  ref: string;
  color: string;
  colorNameWeb: string;
  /** Fijar un valor que aún NO existe en el maestro. Por defecto sólo se aceptan valores existentes. */
  nuevo?: boolean;
  /** Quién edita (para marcar la fila y para auditar). */
  actor: string;
}

export interface EditarColorWebResult {
  ref: string;
  color: string;
  colorNameWeb: string;
  updated: number; // tallas (filas) afectadas
}

/** Error de negocio de REQ-009. El controller lo traduce a 400 (no es un 500). */
export class ColorWebInvalidoError extends Error {}

/**
 * Edita el "color web" de una referencia+color y lo PROPAGA a todas sus tallas (el color web es del
 * color, no de la talla). Marca la fila como editada a mano para que la reimportación la respete.
 */
export class EditarColorWebUseCase {
  constructor(
    private readonly repo: ReferenceRepository,
    private readonly recorder?: ActivityRecorder, // REQ-007: se conecta cuando exista el log de actividad
  ) {}

  async execute(input: EditarColorWebInput): Promise<EditarColorWebResult> {
    const ref = input.ref?.trim();
    const color = input.color?.trim();
    const value = input.colorNameWeb?.trim();
    if (!ref || !color) throw new ColorWebInvalidoError('Falta la referencia o el color a editar.');
    if (!value) throw new ColorWebInvalidoError('El «color web» no puede quedar vacío.');

    // No se inventa un valor por un typo: salvo que se pida explícitamente uno nuevo, debe existir ya.
    if (!input.nuevo) {
      const existentes = await this.repo.existingColorWebValues();
      if (!existentes.includes(value)) {
        throw new ColorWebInvalidoError(
          `El «color web» «${value}» no existe en el maestro. Marca «valor nuevo» si de verdad quieres crearlo.`,
        );
      }
    }

    const { updated, before } = await this.repo.updateColorWebByRefColor(ref, color, value, input.actor);
    if (updated === 0) {
      throw new ColorWebInvalidoError(`No hay ninguna referencia «${ref}» con color «${color}» en el maestro.`);
    }

    // Costura REQ-007: cuando exista el ActivityRecorder, esta llamada deja el rastro (quién, antes→después).
    await this.recorder?.record({
      actor: input.actor,
      entity: 'reference',
      action: 'update',
      entityId: `${ref}/${color}`,
      before: { colorNameWeb: before },
      after: { colorNameWeb: value },
      summary: `color web de ${ref}/${color}: «${before ?? '—'}» → «${value}» (${updated} talla${updated === 1 ? '' : 's'})`,
    });

    return { ref, color, colorNameWeb: value, updated };
  }
}
