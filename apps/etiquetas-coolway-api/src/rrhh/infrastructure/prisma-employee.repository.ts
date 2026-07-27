import { Injectable } from '@nestjs/common';
import { RrhhRole } from '@yorga/contracts';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { EmployeeRepository, EmployeeRow, NuevoEmpleado } from '../application/ports';

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
    center: e.center?.name ?? null,
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

  async create(nuevo: NuevoEmpleado): Promise<EmployeeRow> {
    const e = await this.prisma.employee.create({
      data: {
        userId: nuevo.userId,
        fullName: nuevo.fullName,
        rrhhRole: nuevo.rrhhRole,
        position: nuevo.position,
        managerId: nuevo.managerId,
      },
      include: INCLUDE,
    });
    return toRow(e);
  }
}
