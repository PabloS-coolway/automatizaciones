import { Injectable } from '@nestjs/common';
import { RrhhActivityDto, RrhhActivityListDto } from '@yorga/contracts';
import { PrismaService } from '../../infrastructure/db/prisma.service';

/**
 * REQ-008 · Lectura del log de actividad PROPIO de RRHH (`hr_activity`, append-only). Es el "panel de todo lo
 * que va pasando": altas/bajas, correcciones de fichaje, ausencias, centros… con quién y cuándo. Sólo lee.
 */
@Injectable()
export class RrhhActivityQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(page = 0, pageSize = 50, entity?: string, actorEmail?: string): Promise<RrhhActivityListDto> {
    const take = Math.min(Math.max(pageSize, 1), 200);
    const skip = Math.max(page, 0) * take;
    const where = {
      ...(entity ? { entity } : {}),
      ...(actorEmail ? { actorEmail: { contains: actorEmail, mode: 'insensitive' as const } } : {}),
    };
    const [filas, total] = await Promise.all([
      this.prisma.hrActivity.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.hrActivity.count({ where }),
    ]);
    return { entries: filas.map(toDto), total };
  }
}

function toDto(f: { id: number; createdAt: Date; actorEmail: string; action: string; entity: string; entityId: string; summary: string }): RrhhActivityDto {
  return {
    id: f.id,
    createdAt: f.createdAt.toISOString(),
    actorEmail: f.actorEmail,
    action: f.action as RrhhActivityDto['action'],
    entity: f.entity as RrhhActivityDto['entity'],
    entityId: f.entityId,
    summary: f.summary,
  };
}
