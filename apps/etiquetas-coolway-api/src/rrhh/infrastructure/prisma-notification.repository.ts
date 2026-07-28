import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { NotificationRepository, NotificationRow } from '../application/ports';

type Fila = { id: number; employeeId: number; message: string; link: string | null; readAt: Date | null; createdAt: Date };
const toRow = (n: Fila): NotificationRow => ({ id: n.id, employeeId: n.employeeId, message: n.message, link: n.link, read: n.readAt != null, createdAt: n.createdAt });

/** Adapter: avisos in-app (Prisma). */
@Injectable()
export class PrismaNotificationRepository implements NotificationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { employeeId: number; message: string; link?: string }, tx?: Prisma.TransactionClient): Promise<NotificationRow> {
    const n = await (tx ?? this.prisma).hrNotification.create({ data: { employeeId: data.employeeId, message: data.message, link: data.link } });
    return toRow(n);
  }

  async listForEmployee(employeeId: number, limit: number): Promise<NotificationRow[]> {
    const list = await this.prisma.hrNotification.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' }, take: limit });
    return list.map(toRow);
  }

  countUnread(employeeId: number): Promise<number> {
    return this.prisma.hrNotification.count({ where: { employeeId, readAt: null } });
  }

  async markRead(id: number, employeeId: number): Promise<void> {
    await this.prisma.hrNotification.updateMany({ where: { id, employeeId, readAt: null }, data: { readAt: new Date() } });
  }

  async markAllRead(employeeId: number): Promise<void> {
    await this.prisma.hrNotification.updateMany({ where: { employeeId, readAt: null }, data: { readAt: new Date() } });
  }
}
