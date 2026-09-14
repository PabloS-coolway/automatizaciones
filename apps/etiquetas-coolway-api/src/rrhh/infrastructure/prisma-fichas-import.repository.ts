import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { FichaEmpleadoData, FichasImportRepository } from '../application/fichas-import.port';

/**
 * REQ-012 · Adapter Prisma del importador de fichas. Los catálogos con clave única se resuelven con `upsert`;
 * el centro (cuyo `name` no es único) con find-then-create. Se verifica contra Postgres de verdad (no unit).
 */
@Injectable()
export class PrismaFichasImportRepository implements FichasImportRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertCompany(code: string, name: string): Promise<{ id: number }> {
    return this.prisma.company.upsert({
      where: { code },
      update: { name },
      create: { code, name },
      select: { id: true },
    });
  }

  async upsertZone(name: string): Promise<{ id: number }> {
    return this.prisma.zone.upsert({ where: { name }, update: {}, create: { name }, select: { id: true } });
  }

  async upsertCenter(name: string, brand: string, zoneId: number | null): Promise<{ id: number }> {
    const existente = await this.prisma.center.findFirst({ where: { name }, select: { id: true } });
    if (existente) {
      // Solo enlazamos la zona si la conocemos ahora (no la borramos si esta ficha no la trae).
      if (zoneId != null) await this.prisma.center.update({ where: { id: existente.id }, data: { zoneId } });
      return existente;
    }
    return this.prisma.center.create({ data: { name, brand, zoneId: zoneId ?? undefined }, select: { id: true } });
  }

  async upsertDepartment(name: string): Promise<{ id: number }> {
    return this.prisma.department.upsert({ where: { name }, update: {}, create: { name }, select: { id: true } });
  }

  async upsertContractType(code: string): Promise<{ id: number }> {
    return this.prisma.contractType.upsert({ where: { code }, update: {}, create: { code }, select: { id: true } });
  }

  async upsertSeccion(code: string): Promise<{ id: number }> {
    return this.prisma.seccion.upsert({ where: { code }, update: {}, create: { code }, select: { id: true } });
  }

  async upsertCategoria(name: string): Promise<{ id: number }> {
    return this.prisma.categoria.upsert({ where: { name }, update: {}, create: { name }, select: { id: true } });
  }

  async findUserByEmail(email: string): Promise<{ id: number; hasEmployee: boolean } | null> {
    const u = await this.prisma.user.findUnique({ where: { email }, select: { id: true, employee: { select: { id: true } } } });
    return u ? { id: u.id, hasEmployee: u.employee != null } : null;
  }

  async createUser(data: { email: string; name: string; passwordHash: string; role: string }): Promise<{ id: number }> {
    return this.prisma.user.create({ data, select: { id: true } });
  }

  async findEmployeeByBusinessKey(companyId: number, employeeCode: string): Promise<{ id: number } | null> {
    return this.prisma.employee.findUnique({
      where: { companyId_employeeCode: { companyId, employeeCode } },
      select: { id: true },
    });
  }

  async createEmployee(userId: number, data: FichaEmpleadoData): Promise<{ id: number }> {
    return this.prisma.employee.create({ data: { userId, ...this.mapear(data) }, select: { id: true } });
  }

  async updateEmployee(id: number, data: FichaEmpleadoData): Promise<void> {
    await this.prisma.employee.update({ where: { id }, data: this.mapear(data) });
  }

  /** Campos comunes de alta/edición de la ficha (todos escalares o FKs por id). */
  private mapear(d: FichaEmpleadoData) {
    return {
      fullName: d.fullName,
      dni: d.dni,
      categoriaId: d.categoriaId,
      contractTypeId: d.contractTypeId,
      seccionId: d.seccionId,
      companyId: d.companyId,
      employeeCode: d.employeeCode,
      centerId: d.centerId,
      departmentId: d.departmentId,
      hiredAt: d.hiredAt,
      fechaAntiguedad: d.fechaAntiguedad,
    };
  }
}
