import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { RrhhRole } from '@yorga/contracts';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { EmpleadoUpdate, EmployeeRepository, EmployeeRow, NuevoEmpleado, RrhhCatalogos } from '../application/ports';

const INCLUDE = {
  user: { select: { email: true } },
  department: { select: { name: true } },
  center: { select: { name: true, brand: true } },
  // REQ-012 · capa organizativa e identidad de ficha
  company: { select: { name: true } },
  categoria: { select: { name: true } },
  contractTypeRef: { select: { code: true, name: true } },
  seccion: { select: { code: true, name: true } },
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
  weeklyMinutes: number | null;
  annualLeaveDays: number | null;
  birthDate: Date | null;
  hideBirthday: boolean;
  fichajeDesde: Date | null;
  companyId: number | null;
  employeeCode: string | null;
  dni: string | null;
  categoriaId: number | null;
  contractTypeId: number | null;
  seccionId: number | null;
  fechaAntiguedad: Date | null;
  user: { email: string };
  department: { name: string } | null;
  center: { name: string; brand: string } | null;
  company: { name: string } | null;
  categoria: { name: string } | null;
  contractTypeRef: { code: string; name: string | null } | null;
  seccion: { code: string; name: string | null } | null;
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
    weeklyMinutes: e.weeklyMinutes,
    annualLeaveDays: e.annualLeaveDays,
    birthDate: e.birthDate ? e.birthDate.toISOString().slice(0, 10) : null,
    hideBirthday: e.hideBirthday,
    fichajeDesde: e.fichajeDesde ? e.fichajeDesde.toISOString().slice(0, 10) : null,
    company: e.company?.name ?? null,
    companyId: e.companyId,
    employeeCode: e.employeeCode,
    dni: e.dni,
    categoria: e.categoria?.name ?? null,
    categoriaId: e.categoriaId,
    contrato: e.contractTypeRef ? (e.contractTypeRef.name ?? e.contractTypeRef.code) : null,
    contractTypeId: e.contractTypeId,
    seccion: e.seccion ? (e.seccion.name ?? e.seccion.code) : null,
    seccionId: e.seccionId,
    fechaAntiguedad: e.fechaAntiguedad ? e.fechaAntiguedad.toISOString().slice(0, 10) : null,
  };
}

/** YYYY-MM-DD → Date (medianoche UTC), o null/undefined tal cual. */
function fecha(v: string | null | undefined): Date | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  return new Date(`${v}T00:00:00Z`);
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
        weeklyMinutes: nuevo.weeklyMinutes ?? undefined,
        annualLeaveDays: nuevo.annualLeaveDays ?? undefined,
        birthDate: nuevo.birthDate ? new Date(`${nuevo.birthDate}T00:00:00Z`) : undefined,
        hideBirthday: nuevo.hideBirthday ?? undefined,
        fichajeDesde: nuevo.fichajeDesde ? new Date(`${nuevo.fichajeDesde}T00:00:00Z`) : undefined,
        // REQ-012
        companyId: nuevo.companyId ?? undefined,
        employeeCode: nuevo.employeeCode ?? undefined,
        dni: nuevo.dni ?? undefined,
        categoriaId: nuevo.categoriaId ?? undefined,
        contractTypeId: nuevo.contractTypeId ?? undefined,
        seccionId: nuevo.seccionId ?? undefined,
        fechaAntiguedad: fecha(nuevo.fechaAntiguedad) ?? undefined,
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
        ...(data.weeklyMinutes !== undefined ? { weeklyMinutes: data.weeklyMinutes } : {}),
        ...(data.annualLeaveDays !== undefined ? { annualLeaveDays: data.annualLeaveDays } : {}),
        ...(data.birthDate !== undefined ? { birthDate: data.birthDate ? new Date(`${data.birthDate}T00:00:00Z`) : null } : {}),
        ...(data.hideBirthday !== undefined ? { hideBirthday: data.hideBirthday } : {}),
        ...(data.fichajeDesde !== undefined ? { fichajeDesde: data.fichajeDesde ? new Date(`${data.fichajeDesde}T00:00:00Z`) : null } : {}),
        ...(data.active !== undefined ? { active: data.active, terminatedAt: data.active ? null : new Date() } : {}),
        // REQ-012
        ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
        ...(data.employeeCode !== undefined ? { employeeCode: data.employeeCode } : {}),
        ...(data.dni !== undefined ? { dni: data.dni } : {}),
        ...(data.categoriaId !== undefined ? { categoriaId: data.categoriaId } : {}),
        ...(data.contractTypeId !== undefined ? { contractTypeId: data.contractTypeId } : {}),
        ...(data.seccionId !== undefined ? { seccionId: data.seccionId } : {}),
        ...(data.fechaAntiguedad !== undefined ? { fechaAntiguedad: fecha(data.fechaAntiguedad) } : {}),
      },
      include: INCLUDE,
    });
    return toRow(e);
  }

  async catalogos(): Promise<RrhhCatalogos> {
    const [empresas, categorias, contratos, secciones] = await Promise.all([
      this.prisma.company.findMany({ orderBy: { name: 'asc' }, select: { id: true, code: true, name: true } }),
      this.prisma.categoria.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.prisma.contractType.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
      this.prisma.seccion.findMany({ orderBy: { code: 'asc' }, select: { id: true, code: true, name: true } }),
    ]);
    return { empresas, categorias, contratos, secciones };
  }
}
