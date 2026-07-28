import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import {
  AbsenceRepository,
  AbsenceRow,
  AbsenceTypeRepository,
  AbsenceTypeRow,
  NuevaAusencia,
} from '../application/ports';

type TipoConCuenta = {
  id: number;
  name: string;
  computesBalance: boolean;
  requiresApproval: boolean;
  requiresAttachment: boolean;
  active: boolean;
  _count: { absences: number };
};

const toTipo = (t: TipoConCuenta): AbsenceTypeRow => ({
  id: t.id,
  name: t.name,
  computesBalance: t.computesBalance,
  requiresApproval: t.requiresApproval,
  requiresAttachment: t.requiresAttachment,
  active: t.active,
  usos: t._count.absences,
});

const COUNT = { _count: { select: { absences: true } } } as const;

/** Adapter: catálogo de tipos de ausencia (Prisma). */
@Injectable()
export class PrismaAbsenceTypeRepository implements AbsenceTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(soloActivos = false): Promise<AbsenceTypeRow[]> {
    const list = await this.prisma.absenceType.findMany({
      where: soloActivos ? { active: true } : undefined,
      include: COUNT,
      orderBy: { name: 'asc' },
    });
    return list.map(toTipo);
  }

  async findById(id: number): Promise<AbsenceTypeRow | null> {
    const t = await this.prisma.absenceType.findUnique({ where: { id }, include: COUNT });
    return t ? toTipo(t) : null;
  }

  async create(data: { name: string; computesBalance: boolean; requiresApproval: boolean; requiresAttachment: boolean }): Promise<AbsenceTypeRow> {
    const t = await this.prisma.absenceType.create({ data, include: COUNT });
    return toTipo(t);
  }

  async update(id: number, data: Partial<{ name: string; computesBalance: boolean; requiresApproval: boolean; requiresAttachment: boolean; active: boolean }>): Promise<AbsenceTypeRow> {
    const t = await this.prisma.absenceType.update({ where: { id }, data, include: COUNT });
    return toTipo(t);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.absenceType.delete({ where: { id } });
  }
}

type AusenciaConRel = {
  id: number;
  employeeId: number;
  typeId: number;
  startDate: Date;
  endDate: Date;
  halfDay: boolean;
  halfDayPart: string | null;
  reason: string | null;
  status: string;
  decidedByEmail: string | null;
  decidedAt: Date | null;
  decisionNote: string | null;
  attachmentKey: string | null;
  attachmentName: string | null;
  createdAt: Date;
  employee: { fullName: string; department: { name: string } | null };
  type: { name: string; computesBalance: boolean };
};

const toAusencia = (a: AusenciaConRel): AbsenceRow => ({
  id: a.id,
  employeeId: a.employeeId,
  employeeName: a.employee.fullName,
  department: a.employee.department?.name ?? null,
  typeId: a.typeId,
  typeName: a.type.name,
  computesBalance: a.type.computesBalance,
  startDate: a.startDate,
  endDate: a.endDate,
  halfDay: a.halfDay,
  halfDayPart: a.halfDayPart,
  reason: a.reason,
  status: a.status,
  decidedByEmail: a.decidedByEmail,
  decidedAt: a.decidedAt,
  decisionNote: a.decisionNote,
  attachmentKey: a.attachmentKey,
  attachmentName: a.attachmentName,
  createdAt: a.createdAt,
});

const INCLUDE = {
  employee: { select: { fullName: true, department: { select: { name: true } } } },
  type: { select: { name: true, computesBalance: true } },
} as const;

/** Adapter: solicitudes de ausencia (Prisma). */
@Injectable()
export class PrismaAbsenceRepository implements AbsenceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(n: NuevaAusencia, tx?: Prisma.TransactionClient): Promise<AbsenceRow> {
    const a = await (tx ?? this.prisma).absence.create({
      data: {
        employeeId: n.employeeId,
        typeId: n.typeId,
        startDate: n.startDate,
        endDate: n.endDate,
        halfDay: n.halfDay,
        halfDayPart: n.halfDayPart ?? null,
        reason: n.reason,
        status: n.status,
      },
      include: INCLUDE,
    });
    return toAusencia(a);
  }

  async findById(id: number): Promise<AbsenceRow | null> {
    const a = await this.prisma.absence.findUnique({ where: { id }, include: INCLUDE });
    return a ? toAusencia(a) : null;
  }

  async decidir(id: number, data: { status: string; decidedByEmail: string; decidedAt: Date; decisionNote?: string }, tx?: Prisma.TransactionClient): Promise<AbsenceRow> {
    const a = await (tx ?? this.prisma).absence.update({ where: { id }, data, include: INCLUDE });
    return toAusencia(a);
  }

  async listByEmployee(employeeId: number): Promise<AbsenceRow[]> {
    const list = await this.prisma.absence.findMany({ where: { employeeId }, include: INCLUDE, orderBy: { startDate: 'desc' } });
    return list.map(toAusencia);
  }

  async listByStatusForEmployees(employeeIds: number[], status: string): Promise<AbsenceRow[]> {
    if (employeeIds.length === 0) return [];
    const list = await this.prisma.absence.findMany({
      where: { employeeId: { in: employeeIds }, status },
      include: INCLUDE,
      orderBy: { startDate: 'asc' },
    });
    return list.map(toAusencia);
  }

  async listApprovedByEmployee(employeeId: number): Promise<AbsenceRow[]> {
    const list = await this.prisma.absence.findMany({ where: { employeeId, status: 'APPROVED' }, include: INCLUDE });
    return list.map(toAusencia);
  }

  async listForEmployeesBetween(employeeIds: number[], desde: Date, hasta: Date, statuses: string[]): Promise<AbsenceRow[]> {
    if (employeeIds.length === 0) return [];
    const list = await this.prisma.absence.findMany({
      // Toca el rango si empieza antes del fin Y termina después del inicio.
      where: { employeeId: { in: employeeIds }, status: { in: statuses }, startDate: { lte: hasta }, endDate: { gte: desde } },
      include: INCLUDE,
      orderBy: { startDate: 'asc' },
    });
    return list.map(toAusencia);
  }

  async setAttachment(id: number, key: string, name: string): Promise<AbsenceRow> {
    const a = await this.prisma.absence.update({ where: { id }, data: { attachmentKey: key, attachmentName: name }, include: INCLUDE });
    return toAusencia(a);
  }
}
