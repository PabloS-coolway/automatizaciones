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

/**
 * REQ-004 · Gestión de los destinos. Antes vivían en el código (`markets.ts`): abrir un cliente nuevo
 * exigía un despliegue. Ahora los gobierna Silvia desde la web.
 *
 * Lo que se GENERA usa sólo los destinos ACTIVOS; la pantalla de administración los ve todos.
 */
@Injectable()
export class DestinationsService {
  constructor(@Inject(DESTINATION_REPOSITORY) private readonly repo: DestinationRepository) {}

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

  async create(dto: CreateDestinationDto): Promise<Destination & { id: number }> {
    const limpio = validateNewDestination(dto);
    if (await this.repo.findByCode(limpio.code)) {
      throw new InvalidDestinationError(`Ya existe un destino con el código "${limpio.code}".`);
    }
    return this.repo.create(limpio);
  }

  async update(id: number, dto: UpdateDestinationDto): Promise<Destination & { id: number }> {
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

    return this.repo.update(id, data);
  }
}
