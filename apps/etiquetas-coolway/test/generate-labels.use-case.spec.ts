import { LabelFile, LabelWriterPort } from '../src/application/ports/label-writer.port';
import { MasterReaderPort } from '../src/application/ports/master-reader.port';
import { OrderReaderPort } from '../src/application/ports/order-reader.port';
import { GenerateLabelsUseCase } from '../src/application/use-cases/generate-labels.use-case';
import { MasterReference } from '../src/domain/model/reference';
import { PurchaseOrder } from '../src/domain/model/order';

const order: PurchaseOrder = {
  orderNumber: '4603418',
  lines: [{ style: 'NILO', color: 'BRW', refSap: '76033980200S36', assortment: 'S36', boxes: 4 }],
};
const master: MasterReference[] = [
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '36', ean13: '8433852642814', upc: '843385236998', sku: '7643398-36' },
];

describe('GenerateLabelsUseCase (puertos en memoria)', () => {
  it('orquesta lectura → reglas → cuadre → escritura', async () => {
    const orderReader: OrderReaderPort = { read: async () => order };
    const masterReader: MasterReaderPort = { read: async () => master };
    let written: { file: LabelFile; destination: string } | undefined;
    const labelWriter: LabelWriterPort = { write: async (file, destination) => { written = { file, destination }; } };

    const useCase = new GenerateLabelsUseCase(orderReader, masterReader, labelWriter);
    const result = await useCase.execute({
      orderSource: 'pedido.pdf',
      masterSource: 'maestro.xlsx',
      variant: 'UPC_EAN',
      importadoPor: 'VANYOR',
      outputPath: 'out.xlsx',
    });

    expect(result.reconciliation.balanced).toBe(true);
    expect(result.file.rows).toHaveLength(1);
    expect(result.file.rows[0]).toMatchObject({ ref: '7643398', qty: 4, ean13: '8433852642814', importadoPor: 'VANYOR' });
    expect(written?.destination).toBe('out.xlsx');
    expect(written?.file.orderNumber).toBe('4603418');
  });
});
