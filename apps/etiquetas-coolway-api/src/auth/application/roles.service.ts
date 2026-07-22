import { Inject, Injectable } from '@nestjs/common';
import { CreateRoleDto, Feature, UpdateRoleDto } from '@yorga/contracts';
import {
  assertGestionAlcanzable,
  InvalidRoleError,
  validateFeatures,
  validateNewRole,
} from '../domain/role';
import { ROLE_REPOSITORY, RoleRecord, RoleRepository } from './role.port';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { ACTIVITY_RECORDER, Actor, ActivityRecorder } from '../../actividad/application/activity-recorder.port';

/**
 * REQ-006 Fase 2 · Gestión de roles. Antes los roles y sus permisos vivían en el código; ahora los gobierna
 * un admin desde el panel. Dos cosas que el servicio no deja hacer, pase lo que pase:
 * inventar features fuera del catálogo, y **dejar al sistema sin ningún rol que pueda gestionar roles**.
 */
@Injectable()
export class RolesService {
  constructor(
    @Inject(ROLE_REPOSITORY) private readonly repo: RoleRepository,
    @Inject(ACTIVITY_RECORDER) private readonly actividad: ActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  list(): Promise<RoleRecord[]> {
    return this.repo.findAll();
  }

  async create(dto: CreateRoleDto, actor: Actor): Promise<RoleRecord> {
    const limpio = validateNewRole(dto);
    if (await this.repo.findByKey(limpio.key)) {
      throw new InvalidRoleError(`Ya existe un rol con el código "${limpio.key}".`);
    }
    return this.prisma.$transaction(async (tx) => {
      const creado = await this.repo.create(limpio, tx);
      await this.actividad.record(
        { actor, action: 'CREATE', entity: 'ROLE', entityId: String(creado.id), after: creado, summary: `Creó el rol ${creado.key}` },
        tx,
      );
      return creado;
    });
  }

  async update(id: number, dto: UpdateRoleDto, actor: Actor): Promise<RoleRecord> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new InvalidRoleError(`No existe el rol #${id}.`);

    const data: Partial<{ name: string; features: Feature[]; active: boolean }> = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new InvalidRoleError('El nombre no puede quedar vacío.');
      data.name = name;
    }
    if (dto.features !== undefined) data.features = validateFeatures(dto.features);
    if (dto.active !== undefined) data.active = dto.active;

    // Anti-bloqueo: se simula el estado resultante de TODOS los roles y se comprueba que sigue habiendo
    // alguien que pueda gestionar roles. Si este cambio fuera el que tapia la puerta, se rechaza.
    const resultante = (await this.repo.findAll()).map((r) =>
      r.id === id
        ? { active: data.active ?? r.active, features: data.features ?? r.features }
        : { active: r.active, features: r.features },
    );
    assertGestionAlcanzable(resultante);

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await this.repo.update(id, data, tx);
      await this.actividad.record(
        { actor, action: 'UPDATE', entity: 'ROLE', entityId: String(id), before: actual, after: actualizado, summary: `Editó el rol ${actualizado.key}` },
        tx,
      );
      return actualizado;
    });
  }
}
