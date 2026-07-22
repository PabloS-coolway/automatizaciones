import { Injectable } from '@nestjs/common';
import { ActivityEntryDto, ActivityListResponse } from '@yorga/contracts';
import { PrismaService } from '../../infrastructure/db/prisma.service';

/** REQ-007 · Lectura del log de actividad (append-only). Sólo lee; nadie edita ni borra el log. */
@Injectable()
export class ActivityQueryService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lista las entradas más recientes primero, paginadas. */
  async list(page = 0, pageSize = 50): Promise<ActivityListResponse> {
    const take = Math.min(Math.max(pageSize, 1), 200);
    const skip = Math.max(page, 0) * take;
    const [filas, total] = await Promise.all([
      this.prisma.activityEntry.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
      this.prisma.activityEntry.count(),
    ]);
    return { entries: filas.map(toDto), total };
  }
}

function toDto(f: {
  id: number;
  createdAt: Date;
  actorEmail: string;
  action: string;
  entity: string;
  entityId: string;
  summary: string;
  before: unknown;
  after: unknown;
}): ActivityEntryDto {
  return {
    id: f.id,
    createdAt: f.createdAt.toISOString(),
    actorEmail: f.actorEmail,
    action: f.action as ActivityEntryDto['action'],
    entity: f.entity as ActivityEntryDto['entity'],
    entityId: f.entityId,
    summary: f.summary,
    before: f.before ?? null,
    after: f.after ?? null,
  };
}
