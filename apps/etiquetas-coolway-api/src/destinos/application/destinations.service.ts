import { Inject, Injectable } from '@nestjs/common';
import { CreateDestinationDto, UpdateDestinationDto } from '@yorga/contracts';
import {
  Destination,
  InvalidDestinationError,
  normalizeCode,
  validateNewDestination,
  validateVariant,
} from '../domain/destination';
import { DESTINATION_REPOSITORY, DestinationRepository } from './ports';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { ACTIVITY_RECORDER, Actor, ActivityRecorder } from '../../actividad/application/activity-recorder.port';

/**
 * REQ-004 · Gestión de los destinos. Antes vivían en el código (`markets.ts`): abrir un cliente nuevo
 * exigía un despliegue. Ahora los gobierna Silvia desde la web.
 *
 * Lo que se GENERA usa sólo los destinos ACTIVOS; la pantalla de administración los ve todos.
 */
@Injectable()
export class DestinationsService {
  constructor(
    @Inject(DESTINATION_REPOSITORY) private readonly repo: DestinationRepository,
    @Inject(ACTIVITY_RECORDER) private readonly actividad: ActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  /** Para la pantalla de administración: todos, activos e inactivos. */
  list(): Promise<(Destination & { id: number })[]> {
    return this.repo.findAll();
  }

  /** Para el desplegable al generar: sólo los activos. */
  listActive(): Promise<Destination[]> {
    return this.repo.findActive();
  }

  /**
   * Resuelve el destino elegido al generar. Sustituye al antiguo `resolveMarket` del código.
   * Mantiene el mismo mensaje claro de antes: decir CUÁL falta y cuáles valen.
   */
  async resolve(code: string): Promise<Destination> {
    const encontrado = await this.repo.findByCode(normalizeCode(code));
    if (!encontrado) {
      const validos = (await this.repo.findActive()).map((d) => d.code).join(', ');
      throw new InvalidDestinationError(`Destino desconocido: "${code}". Válidos: ${validos}`);
    }
    // Un destino desactivado no debe generar: se apagó por algo. Se dice claro.
    if (!encontrado.active) {
      throw new InvalidDestinationError(
        `El destino "${encontrado.code}" está desactivado. Actívalo en Destinos si quieres usarlo.`,
      );
    }
    return encontrado;
  }

  async create(dto: CreateDestinationDto, actor: Actor): Promise<Destination & { id: number }> {
    const limpio = validateNewDestination(dto);
    if (await this.repo.findByCode(limpio.code)) {
      throw new InvalidDestinationError(`Ya existe un destino con el código "${limpio.code}".`);
    }
    // El destino y su registro de auditoría se escriben en la MISMA transacción (REQ-007): mejor no crear
    // el destino que crearlo sin dejar rastro.
    return this.prisma.$transaction(async (tx) => {
      const creado = await this.repo.create(limpio, tx);
      await this.actividad.record(
        { actor, action: 'CREATE', entity: 'DESTINATION', entityId: String(creado.id), after: creado, summary: `Creó el destino ${creado.code}` },
        tx,
      );
      return creado;
    });
  }

  async update(id: number, dto: UpdateDestinationDto, actor: Actor): Promise<Destination & { id: number }> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new InvalidDestinationError(`No existe el destino #${id}.`);

    const data: Partial<Omit<Destination, 'code'>> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new InvalidDestinationError('El nombre no puede quedar vacío.');
      data.name = name;
    }
    if (dto.importadoPor !== undefined) {
      const imp = dto.importadoPor.trim();
      if (!imp) throw new InvalidDestinationError('El "importado por" no puede quedar vacío: se imprime en la etiqueta.');
      data.importadoPor = imp;
    }
    // Cambiar la variante afecta a TODAS las etiquetas que se generen a partir de ahora. Es el poder
    // que se le da a Silvia (deliberado), pero la variante sigue estando acotada.
    if (dto.variant !== undefined) data.variant = validateVariant(dto.variant);
    if (dto.active !== undefined) data.active = dto.active;

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await this.repo.update(id, data, tx);
      await this.actividad.record(
        { actor, action: 'UPDATE', entity: 'DESTINATION', entityId: String(id), before: actual, after: actualizado, summary: `Editó el destino ${actualizado.code}` },
        tx,
      );
      return actualizado;
    });
  }
}
