import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { ActivityRecord, ActivityRecorder } from '../application/activity-recorder.port';

const asJson = (v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  v === undefined || v === null ? Prisma.JsonNull : (v as Prisma.InputJsonValue);

/** Adapter: escribe el log en Postgres. Usa el cliente de transacción si se pasa (para atomicidad). */
@Injectable()
export class PrismaActivityRecorder implements ActivityRecorder {
  constructor(private readonly prisma: PrismaService) {}

  async record(e: ActivityRecord, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.activityEntry.create({
      data: {
        actorUserId: e.actor.userId ?? null,
        actorEmail: e.actor.email,
        action: e.action,
        entity: e.entity,
        entityId: e.entityId,
        before: asJson(e.before),
        after: asJson(e.after),
        summary: e.summary,
      },
    });
  }
}
