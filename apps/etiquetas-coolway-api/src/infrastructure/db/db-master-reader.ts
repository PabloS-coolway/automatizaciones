import { Injectable } from '@nestjs/common';
import { MasterReference } from '../../domain/model/reference';
import { PrismaService } from './prisma.service';

/** Lee el maestro desde Postgres (tabla `reference`). */
@Injectable()
export class DbMasterReader {
  constructor(private readonly prisma: PrismaService) {}

  async readAll(): Promise<MasterReference[]> {
    const rows = await this.prisma.reference.findMany();
    return rows.map((r) => ({
      style: r.style,
      color: r.color,
      ref: r.ref,
      size: r.size,
      sku: r.sku,
      ean13: r.ean13 ?? undefined,
      upc: r.upc ?? undefined,
      colorNameWeb: r.colorNameWeb ?? undefined,
    }));
  }
}
