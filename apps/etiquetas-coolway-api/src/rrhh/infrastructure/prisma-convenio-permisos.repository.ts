import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { AbsenceTypeInput, ConvenioPermisoInput } from '../domain/convenio-permisos';
import { ConvenioPermisosRepository, EmpleadoConvenioChain } from '../application/convenio-permisos.port';

/**
 * REQ-012 · Adapter Prisma del resolver de permisos. La cadena convenio se deriva por
 * `employee.center.zone.convenio` (la zona vive en el centro, decisión de diseño). Se verifica contra Postgres.
 */
@Injectable()
export class PrismaConvenioPermisosRepository implements ConvenioPermisosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findEmployeeChain(employeeId: number): Promise<EmpleadoConvenioChain | null> {
    const emp = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        center: {
          select: {
            zone: {
              select: { id: true, name: true, convenio: { select: { id: true, name: true } } },
            },
          },
        },
      },
    });
    if (!emp) return null;

    const zone = emp.center?.zone ?? null;
    return {
      employeeId: emp.id,
      zona: zone ? { id: zone.id, name: zone.name } : null,
      convenio: zone?.convenio ? { id: zone.convenio.id, name: zone.convenio.name } : null,
    };
  }

  async listConvenioPermisos(convenioId: number): Promise<ConvenioPermisoInput[]> {
    const rows = await this.prisma.convenioPermiso.findMany({
      where: { convenioId },
      orderBy: { absenceType: { name: 'asc' } },
      select: {
        diasMax: true,
        remunerado: true,
        absenceType: {
          select: { id: true, name: true, computesBalance: true, requiresApproval: true, requiresAttachment: true },
        },
      },
    });
    return rows.map((r) => ({
      absenceType: r.absenceType,
      diasMax: r.diasMax,
      remunerado: r.remunerado,
    }));
  }

  async listGlobalAbsenceTypes(): Promise<AbsenceTypeInput[]> {
    return this.prisma.absenceType.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, computesBalance: true, requiresApproval: true, requiresAttachment: true },
    });
  }
}
