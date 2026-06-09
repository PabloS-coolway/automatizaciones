import { Provider } from '@nestjs/common';
import { ORDER_READER } from './application/ports/order-reader.port';
import { MASTER_READER } from './application/ports/master-reader.port';
import { GENERATE_LABELS_USE_CASE } from './application/tokens';
import { GenerateLabelsUseCase } from './application/use-cases/generate-labels.use-case';
import { PdfOrderReader } from './infrastructure/pdf/pdf-order-reader.adapter';
import { ExcelMasterReader } from './infrastructure/excel/excel-master-reader.adapter';
import { LabelExcelSerializer } from './infrastructure/excel/label-excel-serializer';
import { OrderReaderPort } from './application/ports/order-reader.port';
import { MasterReaderPort } from './application/ports/master-reader.port';

/**
 * Proveedores comunes (hexágono) que comparten la CLI y la API HTTP:
 * liga puertos → adapters, arma el caso de uso y expone el serializador.
 */
export const coreProviders: Provider[] = [
  { provide: ORDER_READER, useClass: PdfOrderReader },
  { provide: MASTER_READER, useClass: ExcelMasterReader },
  LabelExcelSerializer,
  {
    provide: GENERATE_LABELS_USE_CASE,
    useFactory: (order: OrderReaderPort, master: MasterReaderPort) => new GenerateLabelsUseCase(order, master),
    inject: [ORDER_READER, MASTER_READER],
  },
];
