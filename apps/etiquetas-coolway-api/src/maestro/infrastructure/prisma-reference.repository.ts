import { PrismaClient } from '@prisma/client';
import { MasterReference } from '../domain/codes';
import { ReferenceRepository } from '../application/ports';

/** Adapter: repositorio del maestro sobre Postgres (Prisma). */
export class PrismaReferenceRepository implements ReferenceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  count(): Promise<number> {
    return this.prisma.reference.count();
  }

  async upsertMany(refs: MasterReference[]): Promise<number> {
    for (const r of refs) {
      await this.prisma.reference.upsert({
        where: { ref_size: { ref: r.ref, size: r.size } },
        create: { style: r.style, color: r.color, ref: r.ref, size: r.size, sku: r.sku, ean13: r.ean13, upc: r.upc },
        update: { style: r.style, color: r.color, sku: r.sku, ean13: r.ean13, upc: r.upc },
      });
    }
    return refs.length;
  }
}
