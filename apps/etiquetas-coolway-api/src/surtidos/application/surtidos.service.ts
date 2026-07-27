import { Inject, Injectable } from '@nestjs/common';
import { CreatePodaSurtidoDto, SURTIDO_GRUPOS } from '@yorga/contracts';
import { SURTIDO_REPOSITORY, SurtidoRepository, SurtidoRow } from './ports';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { ACTIVITY_RECORDER, Actor, ActivityRecorder } from '../../actividad/application/activity-recorder.port';

/** Error de negocio del catálogo de surtidos (el controller lo traduce a 400). */
export class SurtidoInvalidoError extends Error {}

/**
 * REQ-011 · Catálogo de surtidos por grupo (prefijo de referencia), gestionado por Silvia desde la web. Al
 * podar (si se activa), se conservan sólo los surtidos del grupo del prefijo. Mutaciones auditadas (REQ-007).
 */
@Injectable()
export class SurtidosService {
  constructor(
    @Inject(SURTIDO_REPOSITORY) private readonly repo: SurtidoRepository,
    @Inject(ACTIVITY_RECORDER) private readonly actividad: ActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  list(): Promise<SurtidoRow[]> {
    return this.repo.findAll();
  }

  async agregar(dto: CreatePodaSurtidoDto, actor: Actor): Promise<SurtidoRow> {
    const grupo = String(dto.grupo ?? '').trim();
    if (!(SURTIDO_GRUPOS as readonly string[]).includes(grupo)) {
      throw new SurtidoInvalidoError(`Grupo de surtido no válido: "${grupo}".`);
    }
    // El SURTD de SAP es de 3 caracteres, en mayúsculas (para que case exacto al podar).
    const codigo = String(dto.codigo ?? '').trim().toUpperCase();
    if (codigo.length !== 3) throw new SurtidoInvalidoError('El código de surtido (SURTD) debe tener 3 caracteres.');
    if (await this.repo.findByGrupoCodigo(grupo, codigo)) {
      throw new SurtidoInvalidoError(`El surtido "${codigo}" ya está en el grupo ${grupo}.`);
    }
    return this.prisma.$transaction(async (tx) => {
      const creado = await this.repo.create(grupo, codigo, tx);
      await this.actividad.record(
        { actor, action: 'CREATE', entity: 'SURTIDO', entityId: String(creado.id), after: creado, summary: `Añadió el surtido ${codigo} al grupo ${grupo}` },
        tx,
      );
      return creado;
    });
  }

  async quitar(id: number, actor: Actor): Promise<void> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new SurtidoInvalidoError(`No existe el surtido #${id}.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.delete(id, tx);
      await this.actividad.record(
        { actor, action: 'DELETE', entity: 'SURTIDO', entityId: String(id), before: actual, summary: `Quitó el surtido ${actual.codigo} del grupo ${actual.grupo}` },
        tx,
      );
    });
  }
}
