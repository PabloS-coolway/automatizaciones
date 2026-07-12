import { PrismaClient } from '@prisma/client';
import { MasterReference } from '../domain/codes';
import { ReferenceRepository, SeedFailure, SeedRow } from '../application/ports';

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

  /**
   * Carga del maestro completo: una fila rechazada (p.ej. EAN13 duplicado) no tumba el resto,
   * pero se devuelve identificada para que el informe diga QUÉ talla se quedó fuera.
   */
  async upsertManySeed(rows: SeedRow[]): Promise<{ ok: number; failures: SeedFailure[] }> {
    let ok = 0;
    const failures: SeedFailure[] = [];

    for (const r of rows) {
      const data = {
        style: r.style,
        color: r.color,
        sku: r.sku,
        ean13: r.ean13 ?? null,
        upc: r.upc ?? null,
        colorNameWeb: r.colorNameWeb ?? null,
      };
      try {
        await this.prisma.reference.upsert({
          where: { ref_size: { ref: r.ref, size: r.size } },
          create: { ref: r.ref, size: r.size, ...data },
          update: data,
        });
        ok++;
      } catch (e) {
        failures.push({ ...pick(r), ...classify(e, r) });
      }
    }
    return { ok, failures };
  }
}

const pick = (r: SeedRow) => ({ style: r.style, color: r.color, ref: r.ref, size: r.size });

/** Traduce el error de Prisma a un motivo entendible (el duplicado de EAN13 es el caso real). */
function classify(e: unknown, r: SeedRow): { reason: SeedFailure['reason']; detail?: string } {
  const err = e as { code?: string; meta?: { target?: unknown }; message?: string };
  const target = Array.isArray(err?.meta?.target) ? (err.meta!.target as string[]).join(',') : String(err?.meta?.target ?? '');
  if (err?.code === 'P2002' && target.includes('ean13')) {
    return { reason: 'duplicate_ean13', detail: `El EAN13 ${r.ean13} ya está asignado a otra referencia del maestro.` };
  }
  return { reason: 'rejected', detail: err?.message?.split('\n')[0] };
}
