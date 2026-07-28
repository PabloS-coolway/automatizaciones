import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { NuevoFichaje, TimeEntryRepository, TimeEntryRow } from '../application/ports';

type Fila = {
  id: number;
  employeeId: number;
  kind: string;
  at: Date;
  source: string;
  note: string | null;
  actorEmail: string | null;
  correctsId: number | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
};

const toRow = (e: Fila): TimeEntryRow => ({
  id: e.id,
  employeeId: e.employeeId,
  kind: e.kind,
  at: e.at,
  source: e.source,
  note: e.note,
  actorEmail: e.actorEmail,
  correctsId: e.correctsId,
  latitude: e.latitude,
  longitude: e.longitude,
  accuracy: e.accuracy,
});

/** Adapter: fichajes sobre Postgres (Prisma). Solo-añadir: sólo `create` y lecturas. */
@Injectable()
export class PrismaTimeEntryRepository implements TimeEntryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async add(entry: NuevoFichaje, tx?: Prisma.TransactionClient): Promise<TimeEntryRow> {
    const e = await (tx ?? this.prisma).timeEntry.create({
      data: {
        employeeId: entry.employeeId,
        kind: entry.kind,
        source: entry.source,
        note: entry.note,
        actorEmail: entry.actorEmail,
        correctsId: entry.correctsId,
        latitude: entry.latitude,
        longitude: entry.longitude,
        accuracy: entry.accuracy,
        ...(entry.at ? { at: entry.at } : {}),
      },
    });
    return toRow(e);
  }

  async findById(id: number): Promise<TimeEntryRow | null> {
    const e = await this.prisma.timeEntry.findUnique({ where: { id } });
    return e ? toRow(e) : null;
  }

  async listBetween(employeeId: number, desde: Date, hasta: Date): Promise<TimeEntryRow[]> {
    const list = await this.prisma.timeEntry.findMany({
      where: { employeeId, at: { gte: desde, lt: hasta } },
      orderBy: { at: 'asc' },
    });
    return list.map(toRow);
  }

  async listBetweenMany(employeeIds: number[], desde: Date, hasta: Date): Promise<TimeEntryRow[]> {
    if (employeeIds.length === 0) return [];
    const list = await this.prisma.timeEntry.findMany({
      where: { employeeId: { in: employeeIds }, at: { gte: desde, lt: hasta } },
      orderBy: { at: 'asc' },
    });
    return list.map(toRow);
  }
}
