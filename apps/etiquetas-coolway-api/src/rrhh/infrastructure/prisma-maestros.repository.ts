import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import {
  CatalogoRow,
  CompanyRow,
  ConvenioPermisoRow,
  ConvenioPermisoSet,
  ConvenioRow,
  MaestrosRepository,
  ZoneRow,
} from '../application/ports';

type Db = PrismaService | Prisma.TransactionClient;

const toCompany = (c: { id: number; code: string; name: string; _count: { employees: number } }): CompanyRow => ({
  id: c.id,
  code: c.code,
  name: c.name,
  employees: c._count.employees,
});

const toZone = (z: { id: number; name: string; convenioId: number | null; convenio: { name: string } | null; _count: { centers: number } }): ZoneRow => ({
  id: z.id,
  name: z.name,
  convenioId: z.convenioId,
  convenioName: z.convenio?.name ?? null,
  centers: z._count.centers,
});

const toConvenio = (c: { id: number; code: string | null; name: string; _count: { zones: number } }): ConvenioRow => ({
  id: c.id,
  code: c.code,
  name: c.name,
  zonas: c._count.zones,
});

const toCatalogo = (c: { id: number; code: string | null; name: string | null; _count: { employees: number } }): CatalogoRow => ({
  id: c.id,
  code: c.code,
  name: c.name,
  employees: c._count.employees,
});

/**
 * REQ-012 · Bloque 3 · Adapter Prisma de la gestión maestra. Cada `list`/`find` trae el conteo de uso
 * (`_count`) que el servicio necesita para bloquear el borrado. El set de permisos de un convenio se reemplaza
 * con un `deleteMany` (lo que sobra) + `upsert` idempotente (lo que entra), dentro de la transacción del servicio.
 */
@Injectable()
export class PrismaMaestrosRepository implements MaestrosRepository {
  constructor(private readonly prisma: PrismaService) {}

  private db(tx?: Prisma.TransactionClient): Db {
    return tx ?? this.prisma;
  }

  // ---- Empresas ----

  async listCompanies(): Promise<CompanyRow[]> {
    const list = await this.prisma.company.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { name: 'asc' } });
    return list.map(toCompany);
  }

  async findCompany(id: number): Promise<CompanyRow | null> {
    const c = await this.prisma.company.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
    return c ? toCompany(c) : null;
  }

  async createCompany(data: { code: string; name: string }, tx?: Prisma.TransactionClient): Promise<CompanyRow> {
    const c = await this.db(tx).company.create({ data, include: { _count: { select: { employees: true } } } });
    return toCompany(c);
  }

  async updateCompany(id: number, data: { code?: string; name?: string }, tx?: Prisma.TransactionClient): Promise<CompanyRow> {
    const c = await this.db(tx).company.update({ where: { id }, data, include: { _count: { select: { employees: true } } } });
    return toCompany(c);
  }

  async deleteCompany(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).company.delete({ where: { id } });
  }

  // ---- Zonas ----

  async listZones(): Promise<ZoneRow[]> {
    const list = await this.prisma.zone.findMany({
      include: { convenio: { select: { name: true } }, _count: { select: { centers: true } } },
      orderBy: { name: 'asc' },
    });
    return list.map(toZone);
  }

  async findZone(id: number): Promise<ZoneRow | null> {
    const z = await this.prisma.zone.findUnique({ where: { id }, include: { convenio: { select: { name: true } }, _count: { select: { centers: true } } } });
    return z ? toZone(z) : null;
  }

  async createZone(data: { name: string; convenioId: number | null }, tx?: Prisma.TransactionClient): Promise<ZoneRow> {
    const z = await this.db(tx).zone.create({ data, include: { convenio: { select: { name: true } }, _count: { select: { centers: true } } } });
    return toZone(z);
  }

  async updateZone(id: number, data: { name?: string; convenioId?: number | null }, tx?: Prisma.TransactionClient): Promise<ZoneRow> {
    const z = await this.db(tx).zone.update({ where: { id }, data, include: { convenio: { select: { name: true } }, _count: { select: { centers: true } } } });
    return toZone(z);
  }

  async deleteZone(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).zone.delete({ where: { id } });
  }

  // ---- Convenios ----

  async listConvenios(): Promise<ConvenioRow[]> {
    const list = await this.prisma.convenio.findMany({ include: { _count: { select: { zones: true } } }, orderBy: { name: 'asc' } });
    return list.map(toConvenio);
  }

  async findConvenio(id: number): Promise<ConvenioRow | null> {
    const c = await this.prisma.convenio.findUnique({ where: { id }, include: { _count: { select: { zones: true } } } });
    return c ? toConvenio(c) : null;
  }

  async createConvenio(data: { code: string | null; name: string }, tx?: Prisma.TransactionClient): Promise<ConvenioRow> {
    const c = await this.db(tx).convenio.create({ data, include: { _count: { select: { zones: true } } } });
    return toConvenio(c);
  }

  async updateConvenio(id: number, data: { code?: string | null; name?: string }, tx?: Prisma.TransactionClient): Promise<ConvenioRow> {
    const c = await this.db(tx).convenio.update({ where: { id }, data, include: { _count: { select: { zones: true } } } });
    return toConvenio(c);
  }

  async deleteConvenio(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).convenio.delete({ where: { id } });
  }

  // ---- Catálogos: categorías ----

  async listCategorias(): Promise<CatalogoRow[]> {
    const list = await this.prisma.categoria.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { name: 'asc' } });
    return list.map(toCatalogo);
  }

  async findCategoria(id: number): Promise<CatalogoRow | null> {
    const c = await this.prisma.categoria.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
    return c ? toCatalogo(c) : null;
  }

  async createCategoria(data: { code: string | null; name: string }, tx?: Prisma.TransactionClient): Promise<CatalogoRow> {
    const c = await this.db(tx).categoria.create({ data, include: { _count: { select: { employees: true } } } });
    return toCatalogo(c);
  }

  async updateCategoria(id: number, data: { code?: string | null; name?: string }, tx?: Prisma.TransactionClient): Promise<CatalogoRow> {
    const c = await this.db(tx).categoria.update({ where: { id }, data, include: { _count: { select: { employees: true } } } });
    return toCatalogo(c);
  }

  async deleteCategoria(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).categoria.delete({ where: { id } });
  }

  // ---- Catálogos: tipos de contrato ----

  async listContractTypes(): Promise<CatalogoRow[]> {
    const list = await this.prisma.contractType.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { code: 'asc' } });
    return list.map(toCatalogo);
  }

  async findContractType(id: number): Promise<CatalogoRow | null> {
    const c = await this.prisma.contractType.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
    return c ? toCatalogo(c) : null;
  }

  async createContractType(data: { code: string; name: string | null }, tx?: Prisma.TransactionClient): Promise<CatalogoRow> {
    const c = await this.db(tx).contractType.create({ data, include: { _count: { select: { employees: true } } } });
    return toCatalogo(c);
  }

  async updateContractType(id: number, data: { code?: string; name?: string | null }, tx?: Prisma.TransactionClient): Promise<CatalogoRow> {
    const c = await this.db(tx).contractType.update({ where: { id }, data, include: { _count: { select: { employees: true } } } });
    return toCatalogo(c);
  }

  async deleteContractType(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).contractType.delete({ where: { id } });
  }

  // ---- Catálogos: secciones ----

  async listSecciones(): Promise<CatalogoRow[]> {
    const list = await this.prisma.seccion.findMany({ include: { _count: { select: { employees: true } } }, orderBy: { code: 'asc' } });
    return list.map(toCatalogo);
  }

  async findSeccion(id: number): Promise<CatalogoRow | null> {
    const c = await this.prisma.seccion.findUnique({ where: { id }, include: { _count: { select: { employees: true } } } });
    return c ? toCatalogo(c) : null;
  }

  async createSeccion(data: { code: string; name: string | null }, tx?: Prisma.TransactionClient): Promise<CatalogoRow> {
    const c = await this.db(tx).seccion.create({ data, include: { _count: { select: { employees: true } } } });
    return toCatalogo(c);
  }

  async updateSeccion(id: number, data: { code?: string; name?: string | null }, tx?: Prisma.TransactionClient): Promise<CatalogoRow> {
    const c = await this.db(tx).seccion.update({ where: { id }, data, include: { _count: { select: { employees: true } } } });
    return toCatalogo(c);
  }

  async deleteSeccion(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await this.db(tx).seccion.delete({ where: { id } });
  }

  // ---- Permisos de un convenio ----

  async listConvenioPermisos(convenioId: number, tx?: Prisma.TransactionClient): Promise<ConvenioPermisoRow[]> {
    const rows = await this.db(tx).convenioPermiso.findMany({
      where: { convenioId },
      orderBy: { absenceType: { name: 'asc' } },
      select: { absenceTypeId: true, diasMax: true, remunerado: true, absenceType: { select: { name: true } } },
    });
    return rows.map((r) => ({ absenceTypeId: r.absenceTypeId, name: r.absenceType.name, diasMax: r.diasMax, remunerado: r.remunerado }));
  }

  async existingAbsenceTypeIds(ids: number[]): Promise<Set<number>> {
    if (ids.length === 0) return new Set();
    const rows = await this.prisma.absenceType.findMany({ where: { id: { in: ids } }, select: { id: true } });
    return new Set(rows.map((r) => r.id));
  }

  async replaceConvenioPermisos(convenioId: number, permisos: ConvenioPermisoSet[], tx?: Prisma.TransactionClient): Promise<ConvenioPermisoRow[]> {
    const db = this.db(tx);
    const ids = permisos.map((p) => p.absenceTypeId);
    // Borra los que ya no están en el set (con lista vacía, borra todos: limpiar el convenio).
    await db.convenioPermiso.deleteMany({ where: { convenioId, absenceTypeId: { notIn: ids } } });
    // Upsert idempotente de los que entran.
    for (const p of permisos) {
      await db.convenioPermiso.upsert({
        where: { convenioId_absenceTypeId: { convenioId, absenceTypeId: p.absenceTypeId } },
        create: { convenioId, absenceTypeId: p.absenceTypeId, diasMax: p.diasMax, remunerado: p.remunerado },
        update: { diasMax: p.diasMax, remunerado: p.remunerado },
      });
    }
    return this.listConvenioPermisos(convenioId, tx);
  }
}
