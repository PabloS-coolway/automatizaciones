import { Command, CommandRunner, Option } from 'nest-commander';
import { PrismaClient } from '@prisma/client';
import { ImportMasterUseCase } from '../application/import-master.use-case';
import { ExcelCodesReader } from '../infrastructure/excel-codes-reader';
import { PrismaReferenceRepository } from '../infrastructure/prisma-reference.repository';

@Command({ name: 'maestro:import', description: 'Importa EAN.xlsm + UPC.xlsm al maestro (Postgres).' })
export class ImportMasterCommand extends CommandRunner {
  async run(_args: string[], opts: { ean?: string; upc?: string }): Promise<void> {
    if (!opts.ean || !opts.upc) {
      console.error('Uso: maestro:import --ean EAN.xlsm --upc UPC.xlsm');
      process.exitCode = 1;
      return;
    }
    const prisma = new PrismaClient();
    try {
      const useCase = new ImportMasterUseCase(new ExcelCodesReader(), new PrismaReferenceRepository(prisma));
      const r = await useCase.execute({ eanSource: opts.ean, upcSource: opts.upc });
      console.log(
        `EAN ${r.eanRows} · UPC ${r.upcRows} → ${r.merged} SKU · upsert ${r.upserted} ` +
          `(nuevos ${r.created}, actualizados ${r.updated}) · saltados ${r.skipped}`,
      );
      const byReason = r.issues.reduce<Record<string, number>>((m, i) => ((m[i.reason] = (m[i.reason] ?? 0) + 1), m), {});
      if (Object.keys(byReason).length) console.log('Incidencias:', JSON.stringify(byReason));
      else console.log('✔ Sin incidencias');
    } finally {
      await prisma.$disconnect();
    }
  }

  @Option({ flags: '--ean <path>', description: 'EAN.xlsm de prepedidos' })
  parseEan(v: string): string {
    return v;
  }

  @Option({ flags: '--upc <path>', description: 'UPC.xlsm de prepedidos' })
  parseUpc(v: string): string {
    return v;
  }
}
