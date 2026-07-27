import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { TimeEntryRepository, TimeEntryRow } from '../application/ports';

type Fila = { id: number; employeeId: number; kind: string; at: Date; source: string; note: string | null };

const toRow = (e: Fila): TimeEntryRow => ({ id: e.id, employeeId: e.employeeId, kind: e.kind, at: e.at, source: e.source, note: e.note });

/** Adapter: fichajes sobre Postgres (Prisma). Solo-añadir: sólo `create` y lecturas. */
@Injectable()
export class PrismaTimeEntryRepository implements TimeEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(entry: { employeeId: number; kind: string; source: string; note?: string; at?: Date }): Promise<TimeEntryRow> {
    const e = await this.prisma.timeEntry.create({
      data: { employeeId: entry.employeeId, kind: entry.kind, source: entry.source, note: entry.note, ...(entry.at ? { at: entry.at } : {}) },
    });
    return toRow(e);
  }

  async listBetween(employeeId: number, desde: Date, hasta: Date): Promise<TimeEntryRow[]> {
    const list = await this.prisma.timeEntry.findMany({
      where: { employeeId, at: { gte: desde, lt: hasta } },
      orderBy: { at: 'asc' },
    });
    return list.map(toRow);
  }
}
