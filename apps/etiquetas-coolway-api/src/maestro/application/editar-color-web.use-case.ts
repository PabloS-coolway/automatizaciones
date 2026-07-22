import { Prisma } from '@prisma/client';
import { ReferenceRepository } from './ports';
import { ActivityRecorder, Actor } from '../../actividad/application/activity-recorder.port';

/** Lo mínimo que necesita el use-case para abrir una transacción (lo cumple PrismaService). Testeable. */
export interface TransactionRunner {
  $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
}

export interface EditarColorWebInput {
  ref: string;
  color: string;
  colorNameWeb: string;
  /** Fijar un valor que aún NO existe en el maestro. Por defecto sólo se aceptan valores existentes. */
  nuevo?: boolean;
  /** Quién edita (del JWT): marca la fila y queda en el log de actividad. */
  actor: Actor;
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
 * color, no de la talla). Marca la fila como editada a mano para que la reimportación la respete, y
 * deja el rastro en el log de actividad (REQ-007) **dentro de la misma transacción**: el cambio y su
 * auditoría entran juntos o no entran.
 */
export class EditarColorWebUseCase {
  constructor(
    private readonly repo: ReferenceRepository,
    private readonly recorder: ActivityRecorder,
    private readonly db: TransactionRunner,
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

    // El cambio y su registro de auditoría, en la MISMA transacción: si falla el log, no hay cambio.
    return this.db.$transaction(async (tx) => {
      const { updated, before } = await this.repo.updateColorWebByRefColor(ref, color, value, input.actor.email, tx);
      if (updated === 0) {
        // Sin filas → se revierte la transacción y NO se registra un cambio fantasma.
        throw new ColorWebInvalidoError(`No hay ninguna referencia «${ref}» con color «${color}» en el maestro.`);
      }

      await this.recorder.record(
        {
          actor: input.actor,
          action: 'UPDATE',
          entity: 'REFERENCE',
          entityId: `${ref}/${color}`,
          before: { colorNameWeb: before },
          after: { colorNameWeb: value },
          summary: `Editó el «color web» de ${ref}/${color}: «${before ?? '—'}» → «${value}» (${updated} talla${updated === 1 ? '' : 's'})`,
        },
        tx,
      );

      return { ref, color, colorNameWeb: value, updated };
    });
  }
}
