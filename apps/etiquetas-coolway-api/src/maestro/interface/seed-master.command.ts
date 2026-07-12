import { Command, CommandRunner, Option } from 'nest-commander';
import { PrismaClient } from '@prisma/client';
import { ExcelMasterReader } from '../../infrastructure/excel/excel-master-reader.adapter';
import { PrismaReferenceRepository } from '../infrastructure/prisma-reference.repository';
import { SeedMasterUseCase } from '../application/seed-master.use-case';

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
      // Mismo caso de uso que usa la web (POST /api/maestro/seed).
      const useCase = new SeedMasterUseCase(new ExcelMasterReader(), new PrismaReferenceRepository(prisma));
      const r = await useCase.execute({ source: opts.master });
      console.log(
        `Maestro: ${r.rows} filas leídas · ${r.valid} válidas → guardadas ${r.upserted}, rechazadas ${r.failed} · nuevas ${r.created}, actualizadas ${r.updated} · total BD ${r.total}`,
      );
      if (r.issues.length > 0) {
        console.warn(`\n⚠ ${r.issues.length} filas NO entraron en el maestro (esas tallas faltarán al etiquetar):`);
        for (const i of r.issues) {
          console.warn(`   ${i.style} ${i.color} ref ${i.ref} talla ${i.size} — ${i.reason}${i.detail ? `: ${i.detail}` : ''}`);
        }
      }
    } finally {
      await prisma.$disconnect();
    }
  }

  @Option({ flags: '-m, --master <path>', description: 'Excel REFERENCIAS COOLWAY' })
  parseMaster(v: string): string {
    return v;
  }
}
