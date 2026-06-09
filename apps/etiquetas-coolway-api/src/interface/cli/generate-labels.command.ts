import { writeFile } from 'node:fs/promises';
import { Inject } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { LabelVariant } from '../../domain/model/types';
import { resolveMarket } from '../../domain/model/destination';
import { GenerateLabelsUseCase } from '../../application/use-cases/generate-labels.use-case';
import { GENERATE_LABELS_USE_CASE } from '../../application/tokens';
import { LabelExcelSerializer } from '../../infrastructure/excel/label-excel-serializer';

interface CliOptions {
  order: string;
  master: string;
  out: string;
  variant?: LabelVariant;
  market?: string;
  importadoPor?: string;
}

const VARIANTS: LabelVariant[] = ['EAN', 'UPC', 'CODE128_EAN', 'UPC_EAN'];

@Command({
  name: 'generate',
  description: 'Genera el fichero de etiquetas a partir del PDF de pedido SAP y el maestro Excel.',
})
export class GenerateLabelsCommand extends CommandRunner {
  constructor(
    @Inject(GENERATE_LABELS_USE_CASE) private readonly useCase: GenerateLabelsUseCase,
    private readonly serializer: LabelExcelSerializer,
  ) {
    super();
  }

  async run(_args: string[], opts: CliOptions): Promise<void> {
    if (!opts.order || !opts.master || !opts.out) {
      console.error('Faltan argumentos. Uso: generate -o pedido.pdf -m maestro.xlsx -O salida.xlsx [-v UPC_EAN]');
      process.exitCode = 1;
      return;
    }

    const preset = opts.market ? resolveMarket(opts.market) : undefined;
    const variant = opts.variant ?? preset?.variant ?? 'UPC_EAN';
    const importadoPor = opts.importadoPor ?? preset?.importadoPor;

    const [result] = await this.useCase.generate({
      orderSources: [opts.order],
      masterSource: opts.master,
      variant,
      importadoPor,
    });

    const buffer = await this.serializer.serialize(result);
    await writeFile(opts.out, buffer);

    const { reconciliation: rec, missing } = result;
    console.log(`Pedido ${result.orderNumber}: ${result.rows.length} filas, ${rec.labelPairs} pares. Variante ${variant}${importadoPor ? `, importado por ${importadoPor}` : ''}.`);
    console.log(rec.balanced ? '✔ Cuadre OK' : `✖ DESCUADRE: salida ${rec.labelPairs} vs pedido ${rec.orderPairs} (${rec.diff})`);
    if (missing.length) {
      console.warn(`⚠ ${missing.length} códigos faltantes en el maestro:`);
      for (const m of missing.slice(0, 20)) console.warn(`  - ${m.style} ${m.color} ${m.size} [${m.reason}]`);
    }
    console.log(`Fichero escrito en ${opts.out}`);
  }

  @Option({ flags: '-o, --order <path>', description: 'PDF del pedido de compra SAP' })
  parseOrder(v: string): string {
    return v;
  }

  @Option({ flags: '-m, --master <path>', description: 'Excel maestro REFERENCIAS COOLWAY' })
  parseMaster(v: string): string {
    return v;
  }

  @Option({ flags: '-O, --out <path>', description: 'Ruta del Excel de salida' })
  parseOut(v: string): string {
    return v;
  }

  @Option({ flags: '-v, --variant <variant>', description: `Variante (override): ${VARIANTS.join(' | ')}` })
  parseVariant(v: string): LabelVariant {
    if (!VARIANTS.includes(v as LabelVariant)) throw new Error(`Variante inválida: ${v}`);
    return v as LabelVariant;
  }

  @Option({ flags: '-d, --market <code>', description: 'Destino: VALENCIA | USA | AUSTRALIA | ITALIA | UK | COSTA_RICA (fija variante + importado por)' })
  parseMarket(v: string): string {
    return v;
  }

  @Option({ flags: '--importado-por <text>', description: 'Override del valor "importado por"' })
  parseImportadoPor(v: string): string {
    return v;
  }
}
