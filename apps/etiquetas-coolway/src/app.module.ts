import { Module } from '@nestjs/common';
import { ORDER_READER } from './application/ports/order-reader.port';
import { MASTER_READER } from './application/ports/master-reader.port';
import { LABEL_WRITER } from './application/ports/label-writer.port';
import { GenerateLabelsUseCase } from './application/use-cases/generate-labels.use-case';
import { PdfOrderReader } from './infrastructure/pdf/pdf-order-reader.adapter';
import { ExcelMasterReader } from './infrastructure/excel/excel-master-reader.adapter';
import { ExcelLabelWriter } from './infrastructure/excel/excel-label-writer.adapter';
import { GenerateLabelsCommand } from './interface/cli/generate-labels.command';
import { GENERATE_LABELS_USE_CASE } from './application/tokens';

/**
 * Composición hexagonal: NestJS hace de inyector. Liga los puertos a sus adapters
 * concretos y arma el caso de uso. Cambiar de adapter (p.ej. Drive API) = cambiar aquí.
 */
@Module({
  providers: [
    { provide: ORDER_READER, useClass: PdfOrderReader },
    { provide: MASTER_READER, useClass: ExcelMasterReader },
    { provide: LABEL_WRITER, useClass: ExcelLabelWriter },
    {
      provide: GENERATE_LABELS_USE_CASE,
      useFactory: (order, master, writer) => new GenerateLabelsUseCase(order, master, writer),
      inject: [ORDER_READER, MASTER_READER, LABEL_WRITER],
    },
    GenerateLabelsCommand,
  ],
})
export class AppModule {}
