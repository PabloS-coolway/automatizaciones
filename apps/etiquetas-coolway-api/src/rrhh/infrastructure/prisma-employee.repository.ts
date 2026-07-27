import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RrhhRole } from '@yorga/contracts';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { EmpleadoUpdate, EmployeeRepository, EmployeeRow, NuevoEmpleado } from '../application/ports';

const INCLUDE = {
  user: { select: { email: true } },
  department: { select: { name: true } },
  center: { select: { name: true, brand: true } },
} as const;

type ConRelaciones = {
  id: number;
  userId: number;
  fullName: string;
  position: string | null;
  rrhhRole: string;
  managerId: number | null;
  active: boolean;
  departmentId: number | null;
  centerId: number | null;
  user: { email: string };
  department: { name: string } | null;
  center: { name: string; brand: string } | null;
};

function toRow(e: ConRelaciones): EmployeeRow {
  return {
    id: e.id,
    userId: e.userId,
    fullName: e.fullName,
    email: e.user.email,
    position: e.position,
    rrhhRole: e.rrhhRole as RrhhRole,
    managerId: e.managerId,
    active: e.active,
    department: e.department?.name ?? null,
    departmentId: e.departmentId,
    center: e.center?.name ?? null,
    centerId: e.centerId,
    brand: e.center?.brand ?? null,
  };
}

/** Adapter: plantilla RRHH sobre Postgres (Prisma). */
@Injectable()
export class PrismaEmployeeRepository implements EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findByUserId(userId: number): Promise<EmployeeRow | null> {
    const e = await this.prisma.employee.findUnique({ where: { userId }, include: INCLUDE });
    return e ? toRow(e) : null;
  }

  async findById(id: number): Promise<EmployeeRow | null> {
    const e = await this.prisma.employee.findUnique({ where: { id }, include: INCLUDE });
    return e ? toRow(e) : null;
  }

  async findAll(): Promise<EmployeeRow[]> {
    const list = await this.prisma.employee.findMany({ include: INCLUDE, orderBy: { fullName: 'asc' } });
    return list.map(toRow);
  }

  async findUserIdByEmail(email: string): Promise<number | null> {
    const u = await this.prisma.user.findUnique({ where: { email }, select: { id: true } });
    return u?.id ?? null;
  }

  async create(nuevo: NuevoEmpleado, tx?: Prisma.TransactionClient): Promise<EmployeeRow> {
    const e = await (tx ?? this.prisma).employee.create({
      data: {
        userId: nuevo.userId,
        fullName: nuevo.fullName,
        rrhhRole: nuevo.rrhhRole,
        position: nuevo.position,
        managerId: nuevo.managerId,
        centerId: nuevo.centerId,
        departmentId: nuevo.departmentId,
      },
      include: INCLUDE,
    });
    return toRow(e);
  }

  async update(id: number, data: EmpleadoUpdate, tx?: Prisma.TransactionClient): Promise<EmployeeRow> {
    const e = await (tx ?? this.prisma).employee.update({
      where: { id },
      data: {
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.rrhhRole !== undefined ? { rrhhRole: data.rrhhRole } : {}),
        ...(data.managerId !== undefined ? { managerId: data.managerId } : {}),
        ...(data.centerId !== undefined ? { centerId: data.centerId } : {}),
        ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
        ...(data.active !== undefined ? { active: data.active, terminatedAt: data.active ? null : new Date() } : {}),
      },
      include: INCLUDE,
    });
    return toRow(e);
  }
}
