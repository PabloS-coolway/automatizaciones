import { unlink } from 'node:fs/promises';
import { Body, Controller, Get, Inject, Post, UploadedFiles, UseInterceptors, BadRequestException } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  GenerateLabelsHttpResponse,
  LabelVariant,
  MARKETS,
  MARKET_CODES,
  MarketDto,
  resolveMarket,
} from '@yorga/contracts';
import { GENERATE_LABELS_USE_CASE } from '../../application/tokens';
import { GenerateLabelsUseCase } from '../../application/use-cases/generate-labels.use-case';
import { LabelExcelSerializer } from '../../infrastructure/excel/label-excel-serializer';
import { Public } from '../../auth/interface/http/decorators';

type Uploaded = { master?: Express.Multer.File[]; orders?: Express.Multer.File[] };
interface GenerateBody {
  market?: string;
  variant?: LabelVariant;
  importadoPor?: string;
  masterSource?: 'db' | 'file'; // por defecto 'file' (Excel subido)
}

@Controller()
export class LabelsController {
  constructor(
    @Inject(GENERATE_LABELS_USE_CASE) private readonly useCase: GenerateLabelsUseCase,
    private readonly serializer: LabelExcelSerializer,
  ) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @Get('markets')
  markets(): { markets: MarketDto[] } {
    return { markets: MARKET_CODES.map((code) => ({ code, ...MARKETS[code] })) };
  }

  @Post('labels/generate')
  @UseInterceptors(FileFieldsInterceptor([{ name: 'master', maxCount: 1 }, { name: 'orders', maxCount: 50 }]))
  async generate(@UploadedFiles() files: Uploaded, @Body() body: GenerateBody): Promise<GenerateLabelsHttpResponse> {
    const masterFile = files.master?.[0];
    const orders = files.orders ?? [];
    const fromDb = body.masterSource === 'db';
    if (orders.length === 0) throw new BadRequestException('Sube al menos un PDF de pedido (campo "orders").');
    if (!fromDb && !masterFile) throw new BadRequestException('Falta el Excel maestro (o usa masterSource=db).');

    const preset = body.market ? resolveMarket(body.market) : undefined;
    const variant = body.variant ?? preset?.variant ?? 'UPC_EAN';
    const importadoPor = body.importadoPor ?? preset?.importadoPor;

    try {
      const results = await this.useCase.generate({
        orderSources: orders.map((o) => o.path),
        master: fromDb ? { kind: 'db' } : { kind: 'file', path: masterFile!.path },
        variant,
        importadoPor,
      });

      const out: GenerateLabelsHttpResponse = { variant, importadoPor, files: [] };
      for (const r of results) {
        const buffer = await this.serializer.serialize(r);
        out.files.push({
          orderNumber: r.orderNumber,
          fileName: this.serializer.fileName(r),
          fileBase64: buffer.toString('base64'),
          rows: r.rows,
          reconciliation: r.reconciliation,
          missing: r.missing,
        });
      }
      return out;
    } finally {
      // limpiar temporales subidos
      const uploaded = [masterFile, ...orders].filter((f): f is Express.Multer.File => !!f);
      await Promise.all(uploaded.map((f) => unlink(f.path).catch(() => undefined)));
    }
  }
}
