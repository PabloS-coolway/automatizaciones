import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/db/prisma.service';
import { HolidayRepository, HolidayRow } from '../application/ports';

type ConCentro = {
  id: number;
  date: Date;
  name: string;
  centerId: number | null;
  center: { name: string } | null;
};

const toRow = (h: ConCentro): HolidayRow => ({
  id: h.id,
  date: h.date,
  name: h.name,
  centerId: h.centerId,
  centerName: h.center?.name ?? null,
});

const INCLUDE = { center: { select: { name: true } } } as const;

/** Adapter: festivos (Prisma). */
@Injectable()
export class PrismaHolidayRepository implements HolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listBetween(desde: Date, hasta: Date, centerId?: number | null): Promise<HolidayRow[]> {
    const list = await this.prisma.holiday.findMany({
      where: {
        date: { gte: desde, lte: hasta },
        // Sin centro → todos; con centro → los globales (centerId null) + los de ese centro.
        ...(centerId != null ? { OR: [{ centerId: null }, { centerId }] } : {}),
      },
      include: INCLUDE,
      orderBy: { date: 'asc' },
    });
    return list.map(toRow);
  }

  async exists(date: Date, centerId: number | null): Promise<boolean> {
    const h = await this.prisma.holiday.findFirst({ where: { date, centerId } });
    return h != null;
  }

  async create(data: { date: Date; name: string; centerId: number | null }): Promise<HolidayRow> {
    const h = await this.prisma.holiday.create({ data, include: INCLUDE });
    return toRow(h);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.holiday.delete({ where: { id } });
  }

  async findById(id: number): Promise<HolidayRow | null> {
    const h = await this.prisma.holiday.findUnique({ where: { id }, include: INCLUDE });
    return h ? toRow(h) : null;
  }
}
