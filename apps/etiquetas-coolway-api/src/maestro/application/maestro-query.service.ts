import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { MaestroStatsDto, ReferencesPageDto } from '@yorga/contracts';
import { PrismaService } from '../../infrastructure/db/prisma.service';

/** Consultas de lectura del maestro (Postgres) para la UI. */
@Injectable()
export class MaestroQuery {
  constructor(private readonly prisma: PrismaService) {}

  async stats(): Promise<MaestroStatsDto> {
    const [total, conEan, conUpc] = await this.prisma.$transaction([
      this.prisma.reference.count(),
      this.prisma.reference.count({ where: { ean13: { not: null } } }),
      this.prisma.reference.count({ where: { upc: { not: null } } }),
    ]);
    const models = await this.prisma.$queryRaw<{ style: string; count: number }[]>`
      SELECT style, COUNT(*)::int AS count FROM reference GROUP BY style ORDER BY style`;
    return { total, conEan, conUpc, models };
  }

  async references(search: string, take: number, skip: number): Promise<ReferencesPageDto> {
    const q = search.trim();
    const where: Prisma.ReferenceWhereInput = q
      ? {
          OR: [
            { ref: { contains: q } },
            { sku: { contains: q } },
            { ean13: { contains: q } },
            { upc: { contains: q } },
            { style: { contains: q, mode: 'insensitive' } },
            { color: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};
    const [total, items] = await this.prisma.$transaction([
      this.prisma.reference.count({ where }),
      this.prisma.reference.findMany({
        where,
        take,
        skip,
        orderBy: [{ style: 'asc' }, { color: 'asc' }, { ref: 'asc' }, { size: 'asc' }],
        select: { style: true, color: true, ref: true, size: true, sku: true, ean13: true, upc: true, colorNameWeb: true },
      }),
    ]);
    return { total, items };
  }
}
