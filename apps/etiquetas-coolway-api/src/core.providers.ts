import { Provider } from '@nestjs/common';
import { ORDER_READER, OrderReaderPort } from './application/ports/order-reader.port';
import { MASTER_PROVIDER, MasterProvider } from './application/ports/master-provider.port';
import { GENERATE_LABELS_USE_CASE } from './application/tokens';
import { GenerateLabelsUseCase } from './application/use-cases/generate-labels.use-case';
import { PdfOrderReader } from './infrastructure/pdf/pdf-order-reader.adapter';
import { ExcelMasterReader } from './infrastructure/excel/excel-master-reader.adapter';
import { LabelExcelSerializer } from './infrastructure/excel/label-excel-serializer';
import { PrismaService } from './infrastructure/db/prisma.service';
import { DbMasterReader } from './infrastructure/db/db-master-reader';
import { DefaultMasterProvider } from './infrastructure/master/default-master-provider';

/**
 * Proveedores comunes (hexágono) que comparten la CLI y la API HTTP:
 * liga puertos → adapters, arma el caso de uso y expone el serializador.
 * El maestro se carga desde BD (Postgres) o desde un Excel, según MasterSource.
 */
export const coreProviders: Provider[] = [
  PrismaService,
  PdfOrderReader,
  ExcelMasterReader,
  DbMasterReader,
  LabelExcelSerializer,
  { provide: ORDER_READER, useExisting: PdfOrderReader },
  { provide: MASTER_PROVIDER, useClass: DefaultMasterProvider },
  {
    provide: GENERATE_LABELS_USE_CASE,
    useFactory: (order: OrderReaderPort, master: MasterProvider) => new GenerateLabelsUseCase(order, master),
    inject: [ORDER_READER, MASTER_PROVIDER],
  },
];
