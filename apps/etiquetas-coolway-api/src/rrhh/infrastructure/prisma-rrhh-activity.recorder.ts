import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { RrhhActivityRecord, RrhhActivityRecorder } from '../application/rrhh-activity.port';

/** Adapter: escribe el log de actividad de RRHH en Postgres (`hr_activity`). Append-only: sólo inserta. */
@Injectable()
export class PrismaRrhhActivityRecorder implements RrhhActivityRecorder {
  constructor(private readonly prisma: PrismaService) {}

  async record(entry: RrhhActivityRecord, tx?: Prisma.TransactionClient): Promise<void> {
    await (tx ?? this.prisma).hrActivity.create({
      data: {
        actorEmail: entry.actorEmail,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId,
        before: entry.before as Prisma.InputJsonValue,
        after: entry.after as Prisma.InputJsonValue,
        summary: entry.summary,
      },
    });
  }
}
