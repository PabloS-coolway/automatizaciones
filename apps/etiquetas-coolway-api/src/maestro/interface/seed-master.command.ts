import { Command, CommandRunner, Option } from 'nest-commander';
import { PrismaClient } from '@prisma/client';
import { ExcelMasterReader } from '../../infrastructure/excel/excel-master-reader.adapter';
import { isValidEan13, isValidUpc, buildSku } from '../domain/codes';

/** Siembra el maestro en Postgres a partir del Excel REFERENCIAS COOLWAY (upsert tolerante). */
@Command({ name: 'maestro:seed', description: 'Carga REFERENCIAS COOLWAY.xlsx en Postgres (upsert).' })
export class SeedMasterCommand extends CommandRunner {
  async run(_args: string[], opts: { master?: string }): Promise<void> {
    if (!opts.master) {
      console.error('Uso: maestro:seed --master "ruta/REFERENCIAS COOLWAY.xlsx"');
      process.exitCode = 1;
      return;
    }
    const prisma = new PrismaClient();
    try {
      const rows = await new ExcelMasterReader().read(opts.master);
      const before = await prisma.reference.count();
      let ok = 0;
      let failed = 0;
      for (const r of rows) {
        if (!r.style || !r.color || !r.ref || !r.size) continue;
        const data = {
          style: r.style,
          color: r.color,
          sku: r.sku || buildSku(r.ref, r.size),
          ean13: isValidEan13(r.ean13) ? r.ean13 : null,
          upc: isValidUpc(r.upc) ? r.upc : null,
          colorNameWeb: r.colorNameWeb ?? null,
        };
        try {
          await prisma.reference.upsert({
            where: { ref_size: { ref: r.ref, size: r.size } },
            create: { ref: r.ref, size: r.size, ...data },
            update: data,
          });
          ok++;
        } catch {
          failed++; // p.ej. ean13 duplicado o formato — se reporta, no aborta
        }
      }
      const after = await prisma.reference.count();
      console.log(`Maestro: ${rows.length} filas leídas → upsert OK ${ok}, fallidas ${failed} · nuevos ${after - before} · total BD ${after}`);
    } finally {
      await prisma.$disconnect();
    }
  }

  @Option({ flags: '-m, --master <path>', description: 'Excel REFERENCIAS COOLWAY' })
  parseMaster(v: string): string {
    return v;
  }
}
