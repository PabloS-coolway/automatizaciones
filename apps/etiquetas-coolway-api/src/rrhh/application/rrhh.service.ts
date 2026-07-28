import { Inject, Injectable } from '@nestjs/common';
import { CreateEmployeeDto, UpdateEmployeeDto } from '@yorga/contracts';
import {
  EMPLOYEE_REPOSITORY,
  EmpleadoUpdate,
  EmployeeRepository,
  EmployeeRow,
  RRHH_STRUCTURE_REPOSITORY,
  StructureRepository,
} from './ports';
import { crearíaCiclo, empleadosVisibles, esRrhhRole } from '../domain/rrhh-org';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RRHH_ACTIVITY_RECORDER, RrhhActivityRecorder } from './rrhh-activity.port';

/** Error de negocio de RRHH (el controller lo traduce a 400). */
export class RrhhError extends Error {}

/** Quién hace la acción (del JWT), para el log de actividad de RRHH. */
export interface RrhhActor {
  email: string;
}

/**
 * REQ-008 · Servicio del módulo RRHH. El alta enlaza con un usuario existente (identidad compartida por
 * correo); RRHH no crea logins. El listado respeta la visibilidad jerárquica. Toda mutación queda en el log
 * de actividad PROPIO de RRHH (append-only), dentro de la misma transacción que el cambio.
 */
@Injectable()
export class RrhhService {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repo: EmployeeRepository,
    @Inject(RRHH_STRUCTURE_REPOSITORY) private readonly estructura: StructureRepository,
    @Inject(RRHH_ACTIVITY_RECORDER) private readonly actividad: RrhhActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  /** Valida que el centro y el departamento (si se indican) existen. `undefined` = no se toca; `null` = quitar. */
  private async validarEstructura(centerId?: number | null, departmentId?: number | null): Promise<void> {
    if (centerId != null && !(await this.estructura.findCenter(centerId))) throw new RrhhError(`El centro #${centerId} no existe.`);
    if (departmentId != null && !(await this.estructura.findDepartment(departmentId))) throw new RrhhError(`El departamento #${departmentId} no existe.`);
  }

  me(userId: number): Promise<EmployeeRow | null> {
    return this.repo.findByUserId(userId);
  }

  /** Organigrama PÚBLICO: toda la plantilla activa (para que cualquiera vea la estructura), sin filtrar por rama. */
  async organigrama(): Promise<EmployeeRow[]> {
    return (await this.repo.findAll()).filter((e) => e.active);
  }

  /** Usuarios del login ACTIVOS que aún no tienen ficha de empleado (candidatos a dar de alta en RRHH). */
  async usuariosSinFicha(): Promise<{ id: number; email: string; name: string }[]> {
    return this.prisma.user.findMany({
      where: { active: true, employee: null },
      select: { id: true, email: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async listVisible(actor: EmployeeRow): Promise<EmployeeRow[]> {
    const all = await this.repo.findAll();
    const visibles = empleadosVisibles(
      { id: actor.id, rrhhRole: actor.rrhhRole },
      all.map((e) => ({ id: e.id, managerId: e.managerId })),
    );
    return all.filter((e) => visibles.has(e.id));
  }

  async crear(dto: CreateEmployeeDto, actor: RrhhActor): Promise<EmployeeRow> {
    const email = String(dto.email ?? '').trim();
    const fullName = String(dto.fullName ?? '').trim();
    if (!email) throw new RrhhError('Falta el correo del usuario a enlazar.');
    if (!fullName) throw new RrhhError('El nombre del empleado no puede quedar vacío.');
    const rrhhRole = dto.rrhhRole ?? 'EMPLEADO';
    if (!esRrhhRole(rrhhRole)) throw new RrhhError(`Rol RRHH no válido: "${rrhhRole}".`);

    const userId = await this.repo.findUserIdByEmail(email);
    if (!userId) throw new RrhhError(`No hay ningún usuario con el correo "${email}". Créalo antes en Usuarios.`);
    if (await this.repo.findByUserId(userId)) throw new RrhhError(`El usuario "${email}" ya tiene ficha de empleado.`);
    if (dto.managerId != null && !(await this.repo.findById(dto.managerId))) {
      throw new RrhhError(`El responsable #${dto.managerId} no existe.`);
    }
    await this.validarEstructura(dto.centerId, dto.departmentId);

    return this.prisma.$transaction(async (tx) => {
      const creado = await this.repo.create(
        {
          userId,
          fullName,
          rrhhRole,
          position: dto.position?.trim() || undefined,
          managerId: dto.managerId ?? undefined,
          centerId: dto.centerId ?? undefined,
          departmentId: dto.departmentId ?? undefined,
          weeklyMinutes: dto.weeklyMinutes ?? undefined,
          annualLeaveDays: dto.annualLeaveDays ?? undefined,
        },
        tx,
      );
      await this.actividad.record(
        { actorEmail: actor.email, action: 'CREATE', entity: 'EMPLEADO', entityId: String(creado.id), after: creado, summary: `Dio de alta a ${creado.fullName} (${creado.email})` },
        tx,
      );
      return creado;
    });
  }

  async editar(id: number, dto: UpdateEmployeeDto, actor: RrhhActor): Promise<EmployeeRow> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new RrhhError(`No existe el empleado #${id}.`);

    const data: EmpleadoUpdate = {};
    if (dto.fullName !== undefined) {
      const nombre = dto.fullName.trim();
      if (!nombre) throw new RrhhError('El nombre del empleado no puede quedar vacío.');
      data.fullName = nombre;
    }
    if (dto.position !== undefined) data.position = dto.position?.trim() || null;
    if (dto.rrhhRole !== undefined) {
      if (!esRrhhRole(dto.rrhhRole)) throw new RrhhError(`Rol RRHH no válido: "${dto.rrhhRole}".`);
      data.rrhhRole = dto.rrhhRole;
    }
    if (dto.managerId !== undefined) {
      if (dto.managerId !== null) {
        if (!(await this.repo.findById(dto.managerId))) throw new RrhhError(`El responsable #${dto.managerId} no existe.`);
        const org = (await this.repo.findAll()).map((e) => ({ id: e.id, managerId: e.managerId }));
        if (crearíaCiclo(id, dto.managerId, org)) {
          throw new RrhhError('Ese responsable crearía un ciclo en el organigrama (no puede ser un subordinado suyo).');
        }
      }
      data.managerId = dto.managerId;
    }
    if (dto.centerId !== undefined) {
      await this.validarEstructura(dto.centerId, undefined);
      data.centerId = dto.centerId;
    }
    if (dto.departmentId !== undefined) {
      await this.validarEstructura(undefined, dto.departmentId);
      data.departmentId = dto.departmentId;
    }
    if (dto.weeklyMinutes !== undefined) {
      if (dto.weeklyMinutes !== null && (!Number.isFinite(dto.weeklyMinutes) || dto.weeklyMinutes < 0)) {
        throw new RrhhError('La jornada teórica semanal debe ser un número de minutos no negativo.');
      }
      data.weeklyMinutes = dto.weeklyMinutes;
    }
    if (dto.annualLeaveDays !== undefined) {
      if (dto.annualLeaveDays !== null && (!Number.isFinite(dto.annualLeaveDays) || dto.annualLeaveDays < 0)) {
        throw new RrhhError('El cupo anual de vacaciones debe ser un número de días no negativo.');
      }
      data.annualLeaveDays = dto.annualLeaveDays;
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await this.repo.update(id, data, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'UPDATE', entity: 'EMPLEADO', entityId: String(id), before: actual, after: actualizado, summary: `Editó la ficha de ${actualizado.fullName}` },
        tx,
      );
      return actualizado;
    });
  }

  darDeBaja(id: number, actor: RrhhActor): Promise<EmployeeRow> {
    return this.cambiarEstado(id, false, actor);
  }

  reactivar(id: number, actor: RrhhActor): Promise<EmployeeRow> {
    return this.cambiarEstado(id, true, actor);
  }

  private async cambiarEstado(id: number, active: boolean, actor: RrhhActor): Promise<EmployeeRow> {
    const actual = await this.repo.findById(id);
    if (!actual) throw new RrhhError(`No existe el empleado #${id}.`);
    if (actual.active === active) return actual; // ya está en ese estado: nada que hacer

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await this.repo.update(id, { active }, tx);
      await this.actividad.record(
        {
          actorEmail: actor.email,
          action: 'UPDATE',
          entity: 'EMPLEADO',
          entityId: String(id),
          before: actual,
          after: actualizado,
          summary: active ? `Reactivó a ${actualizado.fullName}` : `Dio de baja a ${actualizado.fullName}`,
        },
        tx,
      );
      return actualizado;
    });
  }
}
