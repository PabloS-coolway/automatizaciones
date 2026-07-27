import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { CenterRow, DepartmentRow, StructureRepository } from '../application/ports';

const COUNT = { _count: { select: { employees: true } } } as const;

type CenterConCuenta = { id: number; name: string; brand: string; _count: { employees: number } };
type DeptConCuenta = { id: number; name: string; _count: { employees: number } };

const toCenter = (c: CenterConCuenta): CenterRow => ({ id: c.id, name: c.name, brand: c.brand, employees: c._count.employees });
const toDept = (d: DeptConCuenta): DepartmentRow => ({ id: d.id, name: d.name, employees: d._count.employees });

/** Adapter: estructura organizativa (centros y departamentos) sobre Postgres (Prisma). */
@Injectable()
export class PrismaStructureRepository implements StructureRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listCenters(): Promise<CenterRow[]> {
    const list = await this.prisma.center.findMany({ include: COUNT, orderBy: [{ brand: 'asc' }, { name: 'asc' }] });
    return list.map(toCenter);
  }

  async findCenter(id: number): Promise<CenterRow | null> {
    const c = await this.prisma.center.findUnique({ where: { id }, include: COUNT });
    return c ? toCenter(c) : null;
  }

  async createCenter(data: { name: string; brand: string }, tx?: Prisma.TransactionClient): Promise<CenterRow> {
    const c = await (tx ?? this.prisma).center.create({ data, include: COUNT });
    return toCenter(c);
  }

  async updateCenter(id: number, data: { name?: string; brand?: string }, tx?: Prisma.TransactionClient): Promise<CenterRow> {
    const c = await (tx ?? this.prisma).center.update({ where: { id }, data, include: COUNT });
    return toCenter(c);
  }

  async deleteCenter(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).center.delete({ where: { id } });
  }

  async listDepartments(): Promise<DepartmentRow[]> {
    const list = await this.prisma.department.findMany({ include: COUNT, orderBy: { name: 'asc' } });
    return list.map(toDept);
  }

  async findDepartment(id: number): Promise<DepartmentRow | null> {
    const d = await this.prisma.department.findUnique({ where: { id }, include: COUNT });
    return d ? toDept(d) : null;
  }

  async createDepartment(data: { name: string }, tx?: Prisma.TransactionClient): Promise<DepartmentRow> {
    const d = await (tx ?? this.prisma).department.create({ data, include: COUNT });
    return toDept(d);
  }

  async updateDepartment(id: number, data: { name?: string }, tx?: Prisma.TransactionClient): Promise<DepartmentRow> {
    const d = await (tx ?? this.prisma).department.update({ where: { id }, data, include: COUNT });
    return toDept(d);
  }

  async deleteDepartment(id: number, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).department.delete({ where: { id } });
  }
}
