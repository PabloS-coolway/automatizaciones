import { Inject, Injectable } from '@nestjs/common';
import { CreateCenterDto, CreateDepartmentDto, UpdateCenterDto, UpdateDepartmentDto } from '@yorga/contracts';
import { CenterRow, DepartmentRow, RRHH_STRUCTURE_REPOSITORY, StructureRepository } from './ports';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RRHH_ACTIVITY_RECORDER, RrhhActivityRecorder } from './rrhh-activity.port';
import { RrhhActor, RrhhError } from './rrhh.service';

/**
 * REQ-008 Fase 1 (Slice 2) · Estructura organizativa: centros (con marca — segmentan el organigrama) y
 * departamentos. CRUD auditado en el log propio de RRHH. **Un centro/departamento con empleados no se borra**:
 * borrarlo dejaría fichas huérfanas y el organigrama mentiría sobre a qué marca pertenece cada quien.
 */
@Injectable()
export class RrhhStructureService {
  constructor(
    @Inject(RRHH_STRUCTURE_REPOSITORY) private readonly repo: StructureRepository,
    @Inject(RRHH_ACTIVITY_RECORDER) private readonly actividad: RrhhActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  // ---- Centros ----

  listCenters(): Promise<CenterRow[]> {
    return this.repo.listCenters();
  }

  async crearCentro(dto: CreateCenterDto, actor: RrhhActor): Promise<CenterRow> {
    const name = String(dto.name ?? '').trim();
    const brand = String(dto.brand ?? '').trim();
    if (!name) throw new RrhhError('El nombre del centro no puede quedar vacío.');
    if (!brand) throw new RrhhError('La marca del centro no puede quedar vacía.');
    return this.prisma.$transaction(async (tx) => {
      const creado = await this.repo.createCenter({ name, brand }, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'CREATE', entity: 'CENTRO', entityId: String(creado.id), after: creado, summary: `Creó el centro ${creado.name} (${creado.brand})` },
        tx,
      );
      return creado;
    });
  }

  async editarCentro(id: number, dto: UpdateCenterDto, actor: RrhhActor): Promise<CenterRow> {
    const actual = await this.repo.findCenter(id);
    if (!actual) throw new RrhhError(`No existe el centro #${id}.`);
    const data: { name?: string; brand?: string } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new RrhhError('El nombre del centro no puede quedar vacío.');
      data.name = name;
    }
    if (dto.brand !== undefined) {
      const brand = dto.brand.trim();
      if (!brand) throw new RrhhError('La marca del centro no puede quedar vacía.');
      data.brand = brand;
    }
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await this.repo.updateCenter(id, data, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'UPDATE', entity: 'CENTRO', entityId: String(id), before: actual, after: actualizado, summary: `Editó el centro ${actualizado.name}` },
        tx,
      );
      return actualizado;
    });
  }

  async borrarCentro(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.repo.findCenter(id);
    if (!actual) throw new RrhhError(`No existe el centro #${id}.`);
    if (actual.employees > 0) throw new RrhhError(`El centro "${actual.name}" tiene ${actual.employees} empleado(s) asignado(s): reasígnalos antes de borrarlo.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.deleteCenter(id, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'CENTRO', entityId: String(id), before: actual, summary: `Borró el centro ${actual.name}` },
        tx,
      );
    });
  }

  // ---- Departamentos ----

  listDepartments(): Promise<DepartmentRow[]> {
    return this.repo.listDepartments();
  }

  async crearDepartamento(dto: CreateDepartmentDto, actor: RrhhActor): Promise<DepartmentRow> {
    const name = String(dto.name ?? '').trim();
    if (!name) throw new RrhhError('El nombre del departamento no puede quedar vacío.');
    return this.prisma.$transaction(async (tx) => {
      const creado = await this.repo.createDepartment({ name }, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'CREATE', entity: 'DEPARTAMENTO', entityId: String(creado.id), after: creado, summary: `Creó el departamento ${creado.name}` },
        tx,
      );
      return creado;
    });
  }

  async editarDepartamento(id: number, dto: UpdateDepartmentDto, actor: RrhhActor): Promise<DepartmentRow> {
    const actual = await this.repo.findDepartment(id);
    if (!actual) throw new RrhhError(`No existe el departamento #${id}.`);
    const data: { name?: string } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new RrhhError('El nombre del departamento no puede quedar vacío.');
      data.name = name;
    }
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await this.repo.updateDepartment(id, data, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'UPDATE', entity: 'DEPARTAMENTO', entityId: String(id), before: actual, after: actualizado, summary: `Editó el departamento ${actualizado.name}` },
        tx,
      );
      return actualizado;
    });
  }

  async borrarDepartamento(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.repo.findDepartment(id);
    if (!actual) throw new RrhhError(`No existe el departamento #${id}.`);
    if (actual.employees > 0) throw new RrhhError(`El departamento "${actual.name}" tiene ${actual.employees} empleado(s) asignado(s): reasígnalos antes de borrarlo.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.deleteDepartment(id, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'DEPARTAMENTO', entityId: String(id), before: actual, summary: `Borró el departamento ${actual.name}` },
        tx,
      );
    });
  }
}
