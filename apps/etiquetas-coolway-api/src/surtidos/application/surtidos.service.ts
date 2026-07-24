import { Inject, Injectable } from '@nestjs/common';
import { CreateSurtidoDto, UpdateSurtidoDto } from '@yorga/contracts';
import { Surtido, SurtidoInvalidoError, validateSurtido } from '../domain/surtido';
import { SURTIDO_REPOSITORY, SurtidoRepository } from './ports';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { ACTIVITY_RECORDER, Actor, ActivityRecorder } from '../../actividad/application/activity-recorder.port';

/**
 * REQ-010 · Fase 2 — Catálogo de surtidos que Silvia gestiona desde la web (patrón REQ-004 · destinos). Al
 * podar el fichero de surtidos, se conserva sólo el `SURTD` asignado a cada ref. Toda mutación queda en el
 * log de actividad (REQ-007), en la misma transacción que el cambio.
 */
@Injectable()
export class SurtidosService {
  constructor(
    @Inject(SURTIDO_REPOSITORY) private readonly repo: SurtidoRepository,
    @Inject(ACTIVITY_RECORDER) private readonly actividad: ActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  list(): Promise<(Surtido & { id: number })[]> {
    return this.repo.findAll();
  }

  async create(dto: CreateSurtidoDto, actor: Actor): Promise<Surtido & { id: number }> {
    const limpio = validateSurtido(dto);
    if (await this.repo.findByRef(limpio.ref)) {
      throw new SurtidoInvalidoError(`Ya hay un surtido asignado a la referencia "${limpio.ref}".`);
    }
    return this.prisma.$transaction(async (tx) => {
      const creado = await this.repo.create(limpio, tx);
      await this.actividad.record(
        {
          actor,
          action: 'CREATE',
          entity: 'SURTIDO',
          entityId: String(creado.id),
          after: creado,
          summary: `Asignó el surtido ${creado.surtido} a la ref ${creado.ref}`,
        },
        tx,
      );
      return creado;
    });
  }

  async update(id: number, dto: UpdateSurtidoDto, actor: Actor): Promise<Surtido & { id: number }> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new SurtidoInvalidoError(`No existe el surtido #${id}.`);
    const surtido = String(dto.surtido ?? '').trim();
    if (!surtido) throw new SurtidoInvalidoError('El código de surtido (SURTD) no puede quedar vacío.');

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await this.repo.update(id, surtido, tx);
      await this.actividad.record(
        {
          actor,
          action: 'UPDATE',
          entity: 'SURTIDO',
          entityId: String(id),
          before: actual,
          after: actualizado,
          summary: `Cambió el surtido de la ref ${actualizado.ref}: ${actual.surtido} → ${actualizado.surtido}`,
        },
        tx,
      );
      return actualizado;
    });
  }

  async remove(id: number, actor: Actor): Promise<void> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new SurtidoInvalidoError(`No existe el surtido #${id}.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.delete(id, tx);
      await this.actividad.record(
        {
          actor,
          action: 'DELETE',
          entity: 'SURTIDO',
          entityId: String(id),
          before: actual,
          summary: `Quitó el surtido de la ref ${actual.ref}`,
        },
        tx,
      );
    });
  }
}
