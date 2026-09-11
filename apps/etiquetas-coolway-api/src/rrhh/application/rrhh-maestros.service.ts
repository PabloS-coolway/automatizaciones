import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  CreateCategoriaDto,
  CreateCompanyDto,
  CreateContractTypeDto,
  CreateConvenioDto,
  CreateSeccionDto,
  CreateZoneDto,
  SetConvenioPermisosDto,
  UpdateCategoriaDto,
  UpdateCompanyDto,
  UpdateContractTypeDto,
  UpdateConvenioDto,
  UpdateSeccionDto,
  UpdateZoneDto,
} from '@yorga/contracts';
import {
  CatalogoRow,
  CompanyRow,
  ConvenioPermisoRow,
  ConvenioPermisoSet,
  ConvenioRow,
  MaestrosRepository,
  RRHH_MAESTROS_REPOSITORY,
  ZoneRow,
} from './ports';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RRHH_ACTIVITY_RECORDER, RrhhActivityRecorder } from './rrhh-activity.port';
import { RrhhActor, RrhhError } from './rrhh.service';

/**
 * REQ-012 · Bloque 3 · Gestión maestra. CRUD auditado de la capa organizativa de RRHH (empresas, zonas,
 * convenios y catálogos de categoría / tipo de contrato / sección) más el editor convenio→permisos, que es lo
 * que consume el resolver de permisos efectivos. Reglas duras: no se borra nada **en uso** (dejaría fichas o
 * asignaciones colgando) y un choque de unicidad (`code`/`name`) se traduce a un error de negocio claro (400),
 * nunca a un 500 de Prisma.
 */
@Injectable()
export class RrhhMaestrosService {
  constructor(
    @Inject(RRHH_MAESTROS_REPOSITORY) private readonly repo: MaestrosRepository,
    @Inject(RRHH_ACTIVITY_RECORDER) private readonly actividad: RrhhActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  /** Traduce un choque de índice único de Prisma (P2002) a un error de negocio legible en español. */
  private async sinChoque<T>(entidad: string, accion: () => Promise<T>): Promise<T> {
    try {
      return await accion();
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = e.meta?.target;
        const campos = Array.isArray(target) ? target.join(', ') : String(target ?? '');
        const campo = /code|codigo/i.test(campos) ? 'código' : 'nombre';
        throw new RrhhError(`Ya existe ${entidad} con ese ${campo}.`);
      }
      throw e;
    }
  }

  // ==================== Empresas ====================

  listEmpresas(): Promise<CompanyRow[]> {
    return this.repo.listCompanies();
  }

  async crearEmpresa(dto: CreateCompanyDto, actor: RrhhActor): Promise<CompanyRow> {
    const code = String(dto.code ?? '').trim();
    const name = String(dto.name ?? '').trim();
    if (!code) throw new RrhhError('El código de la empresa no puede quedar vacío.');
    if (!name) throw new RrhhError('El nombre de la empresa no puede quedar vacío.');
    return this.sinChoque('una empresa', () =>
      this.prisma.$transaction(async (tx) => {
        const creado = await this.repo.createCompany({ code, name }, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'CREATE', entity: 'EMPRESA', entityId: String(creado.id), after: creado, summary: `Creó la empresa ${creado.name} (${creado.code})` },
          tx,
        );
        return creado;
      }),
    );
  }

  async editarEmpresa(id: number, dto: UpdateCompanyDto, actor: RrhhActor): Promise<CompanyRow> {
    const actual = await this.repo.findCompany(id);
    if (!actual) throw new RrhhError(`No existe la empresa #${id}.`);
    const data: { code?: string; name?: string } = {};
    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) throw new RrhhError('El código de la empresa no puede quedar vacío.');
      data.code = code;
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new RrhhError('El nombre de la empresa no puede quedar vacío.');
      data.name = name;
    }
    return this.sinChoque('una empresa', () =>
      this.prisma.$transaction(async (tx) => {
        const actualizado = await this.repo.updateCompany(id, data, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'UPDATE', entity: 'EMPRESA', entityId: String(id), before: actual, after: actualizado, summary: `Editó la empresa ${actualizado.name}` },
          tx,
        );
        return actualizado;
      }),
    );
  }

  async borrarEmpresa(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.repo.findCompany(id);
    if (!actual) throw new RrhhError(`No existe la empresa #${id}.`);
    if (actual.employees > 0) throw new RrhhError(`La empresa "${actual.name}" tiene ${actual.employees} empleado(s) asignado(s): reasígnalos antes de borrarla.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.deleteCompany(id, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'EMPRESA', entityId: String(id), before: actual, summary: `Borró la empresa ${actual.name}` },
        tx,
      );
    });
  }

  // ==================== Zonas ====================

  listZonas(): Promise<ZoneRow[]> {
    return this.repo.listZones();
  }

  /** Valida que el convenio (si se indica) existe. `undefined` = no se toca; `null` = quitar convenio. */
  private async validarConvenio(convenioId?: number | null): Promise<void> {
    if (convenioId != null && !(await this.repo.findConvenio(convenioId))) throw new RrhhError(`El convenio #${convenioId} no existe.`);
  }

  async crearZona(dto: CreateZoneDto, actor: RrhhActor): Promise<ZoneRow> {
    const name = String(dto.name ?? '').trim();
    if (!name) throw new RrhhError('El nombre de la zona no puede quedar vacío.');
    const convenioId = dto.convenioId ?? null;
    await this.validarConvenio(convenioId);
    return this.sinChoque('una zona', () =>
      this.prisma.$transaction(async (tx) => {
        const creado = await this.repo.createZone({ name, convenioId }, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'CREATE', entity: 'ZONA', entityId: String(creado.id), after: creado, summary: `Creó la zona ${creado.name}` },
          tx,
        );
        return creado;
      }),
    );
  }

  async editarZona(id: number, dto: UpdateZoneDto, actor: RrhhActor): Promise<ZoneRow> {
    const actual = await this.repo.findZone(id);
    if (!actual) throw new RrhhError(`No existe la zona #${id}.`);
    const data: { name?: string; convenioId?: number | null } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new RrhhError('El nombre de la zona no puede quedar vacío.');
      data.name = name;
    }
    if (dto.convenioId !== undefined) {
      await this.validarConvenio(dto.convenioId);
      data.convenioId = dto.convenioId;
    }
    return this.sinChoque('una zona', () =>
      this.prisma.$transaction(async (tx) => {
        const actualizado = await this.repo.updateZone(id, data, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'UPDATE', entity: 'ZONA', entityId: String(id), before: actual, after: actualizado, summary: `Editó la zona ${actualizado.name}` },
          tx,
        );
        return actualizado;
      }),
    );
  }

  async borrarZona(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.repo.findZone(id);
    if (!actual) throw new RrhhError(`No existe la zona #${id}.`);
    if (actual.centers > 0) throw new RrhhError(`La zona "${actual.name}" la usan ${actual.centers} centro(s): cámbiaselos antes de borrarla.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.deleteZone(id, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'ZONA', entityId: String(id), before: actual, summary: `Borró la zona ${actual.name}` },
        tx,
      );
    });
  }

  // ==================== Convenios ====================

  listConvenios(): Promise<ConvenioRow[]> {
    return this.repo.listConvenios();
  }

  async crearConvenio(dto: CreateConvenioDto, actor: RrhhActor): Promise<ConvenioRow> {
    const name = String(dto.name ?? '').trim();
    if (!name) throw new RrhhError('El nombre del convenio no puede quedar vacío.');
    const code = dto.code?.trim() || null;
    return this.sinChoque('un convenio', () =>
      this.prisma.$transaction(async (tx) => {
        const creado = await this.repo.createConvenio({ code, name }, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'CREATE', entity: 'CONVENIO', entityId: String(creado.id), after: creado, summary: `Creó el convenio ${creado.name}` },
          tx,
        );
        return creado;
      }),
    );
  }

  async editarConvenio(id: number, dto: UpdateConvenioDto, actor: RrhhActor): Promise<ConvenioRow> {
    const actual = await this.repo.findConvenio(id);
    if (!actual) throw new RrhhError(`No existe el convenio #${id}.`);
    const data: { code?: string | null; name?: string } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new RrhhError('El nombre del convenio no puede quedar vacío.');
      data.name = name;
    }
    if (dto.code !== undefined) data.code = dto.code?.trim() || null;
    return this.sinChoque('un convenio', () =>
      this.prisma.$transaction(async (tx) => {
        const actualizado = await this.repo.updateConvenio(id, data, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'UPDATE', entity: 'CONVENIO', entityId: String(id), before: actual, after: actualizado, summary: `Editó el convenio ${actualizado.name}` },
          tx,
        );
        return actualizado;
      }),
    );
  }

  async borrarConvenio(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.repo.findConvenio(id);
    if (!actual) throw new RrhhError(`No existe el convenio #${id}.`);
    if (actual.zonas > 0) throw new RrhhError(`El convenio "${actual.name}" lo usan ${actual.zonas} zona(s): cámbiaselo antes de borrarlo.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.deleteConvenio(id, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'CONVENIO', entityId: String(id), before: actual, summary: `Borró el convenio ${actual.name}` },
        tx,
      );
    });
  }

  // ==================== Permisos de un convenio ====================

  async permisosDeConvenio(convenioId: number): Promise<ConvenioPermisoRow[]> {
    if (!(await this.repo.findConvenio(convenioId))) throw new RrhhError(`No existe el convenio #${convenioId}.`);
    return this.repo.listConvenioPermisos(convenioId);
  }

  /**
   * Reemplaza el set de permisos de un convenio de forma idempotente: normaliza y deduplica por
   * `absenceTypeId` (gana el último), valida que cada tipo de ausencia existe, y delega el borrado+upsert al
   * adapter. Volver a llamarlo con la misma entrada deja el mismo estado.
   */
  async setPermisosDeConvenio(convenioId: number, dto: SetConvenioPermisosDto, actor: RrhhActor): Promise<ConvenioPermisoRow[]> {
    const convenio = await this.repo.findConvenio(convenioId);
    if (!convenio) throw new RrhhError(`No existe el convenio #${convenioId}.`);

    const porTipo = new Map<number, ConvenioPermisoSet>();
    for (const p of dto.permisos ?? []) {
      const absenceTypeId = Number(p.absenceTypeId);
      if (!Number.isInteger(absenceTypeId)) throw new RrhhError('Cada permiso debe referirse a un tipo de ausencia válido.');
      let diasMax: number | null = null;
      if (p.diasMax != null) {
        diasMax = Number(p.diasMax);
        if (!Number.isInteger(diasMax) || diasMax < 0) throw new RrhhError('Los días máximos deben ser un número entero no negativo.');
      }
      const remunerado = p.remunerado == null ? null : Boolean(p.remunerado);
      porTipo.set(absenceTypeId, { absenceTypeId, diasMax, remunerado });
    }
    const permisos = [...porTipo.values()];

    const existentes = await this.repo.existingAbsenceTypeIds(permisos.map((p) => p.absenceTypeId));
    const faltan = permisos.filter((p) => !existentes.has(p.absenceTypeId)).map((p) => p.absenceTypeId);
    if (faltan.length) throw new RrhhError(`No existe(n) el/los tipo(s) de ausencia: ${faltan.join(', ')}.`);

    return this.prisma.$transaction(async (tx) => {
      const res = await this.repo.replaceConvenioPermisos(convenioId, permisos, tx);
      await this.actividad.record(
        {
          actorEmail: actor.email,
          action: 'UPDATE',
          entity: 'CONVENIO_PERMISO',
          entityId: String(convenioId),
          after: res,
          summary: `Actualizó los permisos del convenio ${convenio.name} (${res.length} permiso(s))`,
        },
        tx,
      );
      return res;
    });
  }

  // ==================== Catálogos: categorías ====================

  listCategorias(): Promise<CatalogoRow[]> {
    return this.repo.listCategorias();
  }

  async crearCategoria(dto: CreateCategoriaDto, actor: RrhhActor): Promise<CatalogoRow> {
    const name = String(dto.name ?? '').trim();
    if (!name) throw new RrhhError('El nombre de la categoría no puede quedar vacío.');
    const code = dto.code?.trim() || null;
    return this.sinChoque('una categoría', () =>
      this.prisma.$transaction(async (tx) => {
        const creado = await this.repo.createCategoria({ code, name }, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'CREATE', entity: 'CATEGORIA', entityId: String(creado.id), after: creado, summary: `Creó la categoría ${creado.name}` },
          tx,
        );
        return creado;
      }),
    );
  }

  async editarCategoria(id: number, dto: UpdateCategoriaDto, actor: RrhhActor): Promise<CatalogoRow> {
    const actual = await this.repo.findCategoria(id);
    if (!actual) throw new RrhhError(`No existe la categoría #${id}.`);
    const data: { code?: string | null; name?: string } = {};
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (!name) throw new RrhhError('El nombre de la categoría no puede quedar vacío.');
      data.name = name;
    }
    if (dto.code !== undefined) data.code = dto.code?.trim() || null;
    return this.sinChoque('una categoría', () =>
      this.prisma.$transaction(async (tx) => {
        const actualizado = await this.repo.updateCategoria(id, data, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'UPDATE', entity: 'CATEGORIA', entityId: String(id), before: actual, after: actualizado, summary: `Editó la categoría ${actualizado.name}` },
          tx,
        );
        return actualizado;
      }),
    );
  }

  async borrarCategoria(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.repo.findCategoria(id);
    if (!actual) throw new RrhhError(`No existe la categoría #${id}.`);
    if (actual.employees > 0) throw new RrhhError(`La categoría "${actual.name}" la usan ${actual.employees} empleado(s): cámbiasela antes de borrarla.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.deleteCategoria(id, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'CATEGORIA', entityId: String(id), before: actual, summary: `Borró la categoría ${actual.name}` },
        tx,
      );
    });
  }

  // ==================== Catálogos: tipos de contrato ====================

  listContratos(): Promise<CatalogoRow[]> {
    return this.repo.listContractTypes();
  }

  async crearContrato(dto: CreateContractTypeDto, actor: RrhhActor): Promise<CatalogoRow> {
    const code = String(dto.code ?? '').trim();
    if (!code) throw new RrhhError('El código del tipo de contrato no puede quedar vacío.');
    const name = dto.name?.trim() || null;
    return this.sinChoque('un tipo de contrato', () =>
      this.prisma.$transaction(async (tx) => {
        const creado = await this.repo.createContractType({ code, name }, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'CREATE', entity: 'TIPO_CONTRATO', entityId: String(creado.id), after: creado, summary: `Creó el tipo de contrato ${creado.code}` },
          tx,
        );
        return creado;
      }),
    );
  }

  async editarContrato(id: number, dto: UpdateContractTypeDto, actor: RrhhActor): Promise<CatalogoRow> {
    const actual = await this.repo.findContractType(id);
    if (!actual) throw new RrhhError(`No existe el tipo de contrato #${id}.`);
    const data: { code?: string; name?: string | null } = {};
    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) throw new RrhhError('El código del tipo de contrato no puede quedar vacío.');
      data.code = code;
    }
    if (dto.name !== undefined) data.name = dto.name?.trim() || null;
    return this.sinChoque('un tipo de contrato', () =>
      this.prisma.$transaction(async (tx) => {
        const actualizado = await this.repo.updateContractType(id, data, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'UPDATE', entity: 'TIPO_CONTRATO', entityId: String(id), before: actual, after: actualizado, summary: `Editó el tipo de contrato ${actualizado.code}` },
          tx,
        );
        return actualizado;
      }),
    );
  }

  async borrarContrato(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.repo.findContractType(id);
    if (!actual) throw new RrhhError(`No existe el tipo de contrato #${id}.`);
    if (actual.employees > 0) throw new RrhhError(`El tipo de contrato "${actual.code}" lo usan ${actual.employees} empleado(s): cámbiaselo antes de borrarlo.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.deleteContractType(id, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'TIPO_CONTRATO', entityId: String(id), before: actual, summary: `Borró el tipo de contrato ${actual.code}` },
        tx,
      );
    });
  }

  // ==================== Catálogos: secciones ====================

  listSecciones(): Promise<CatalogoRow[]> {
    return this.repo.listSecciones();
  }

  async crearSeccion(dto: CreateSeccionDto, actor: RrhhActor): Promise<CatalogoRow> {
    const code = String(dto.code ?? '').trim();
    if (!code) throw new RrhhError('El código de la sección no puede quedar vacío.');
    const name = dto.name?.trim() || null;
    return this.sinChoque('una sección', () =>
      this.prisma.$transaction(async (tx) => {
        const creado = await this.repo.createSeccion({ code, name }, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'CREATE', entity: 'SECCION', entityId: String(creado.id), after: creado, summary: `Creó la sección ${creado.code}` },
          tx,
        );
        return creado;
      }),
    );
  }

  async editarSeccion(id: number, dto: UpdateSeccionDto, actor: RrhhActor): Promise<CatalogoRow> {
    const actual = await this.repo.findSeccion(id);
    if (!actual) throw new RrhhError(`No existe la sección #${id}.`);
    const data: { code?: string; name?: string | null } = {};
    if (dto.code !== undefined) {
      const code = dto.code.trim();
      if (!code) throw new RrhhError('El código de la sección no puede quedar vacío.');
      data.code = code;
    }
    if (dto.name !== undefined) data.name = dto.name?.trim() || null;
    return this.sinChoque('una sección', () =>
      this.prisma.$transaction(async (tx) => {
        const actualizado = await this.repo.updateSeccion(id, data, tx);
        await this.actividad.record(
          { actorEmail: actor.email, action: 'UPDATE', entity: 'SECCION', entityId: String(id), before: actual, after: actualizado, summary: `Editó la sección ${actualizado.code}` },
          tx,
        );
        return actualizado;
      }),
    );
  }

  async borrarSeccion(id: number, actor: RrhhActor): Promise<void> {
    const actual = await this.repo.findSeccion(id);
    if (!actual) throw new RrhhError(`No existe la sección #${id}.`);
    if (actual.employees > 0) throw new RrhhError(`La sección "${actual.code}" la usan ${actual.employees} empleado(s): cámbiasela antes de borrarla.`);
    await this.prisma.$transaction(async (tx) => {
      await this.repo.deleteSeccion(id, tx);
      await this.actividad.record(
        { actorEmail: actor.email, action: 'DELETE', entity: 'SECCION', entityId: String(id), before: actual, summary: `Borró la sección ${actual.code}` },
        tx,
      );
    });
  }
}
