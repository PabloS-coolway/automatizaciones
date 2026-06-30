import { MasterProvider } from '../src/application/ports/master-provider.port';
import { OrderReaderPort } from '../src/application/ports/order-reader.port';
import { GenerateLabelsUseCase } from '../src/application/use-cases/generate-labels.use-case';
import { MasterReference } from '../src/domain/model/reference';
import { PurchaseOrder } from '../src/domain/model/order';

const orders: Record<string, PurchaseOrder> = {
  'a.pdf': { orderNumber: '4603418', lines: [{ style: 'NILO', color: 'BRW', refSap: '76033980200S36', assortment: 'S36', boxes: 4 }] },
  'b.pdf': { orderNumber: '4603419', lines: [{ style: 'NILO', color: 'BRW', refSap: '76033980200S37', assortment: 'S37', boxes: 2 }] },
};
const master: MasterReference[] = [
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '36', ean13: '8433852642814', upc: '843385236998', sku: '7643398-36' },
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '37', ean13: '8433852642821', upc: '843385237001', sku: '7643398-37' },
];

describe('GenerateLabelsUseCase (puertos en memoria)', () => {
  const orderReader: OrderReaderPort = { read: async (src) => orders[src] };
  let masterLoads = 0;
  const masterProvider: MasterProvider = { load: async () => { masterLoads++; return master; } };
  const useCase = new GenerateLabelsUseCase(orderReader, masterProvider);

  it('procesa un pedido leyendo el maestro de la BD: reglas + cuadre + importado por', async () => {
    const [result] = await useCase.generate({ orderSources: ['a.pdf'], master: { kind: 'db' }, variant: 'UPC_EAN', importadoPor: 'VANYOR' });
    expect(result.orderNumber).toBe('4603418');
    expect(result.reconciliation.balanced).toBe(true);
    expect(result.rows[0]).toMatchObject({ ref: '7643398', qty: 4, ean13: '8433852642814', importadoPor: 'VANYOR' });
  });

  it('modo batch desde archivo: N pedidos cargando el maestro UNA sola vez', async () => {
    masterLoads = 0;
    const results = await useCase.generate({ orderSources: ['a.pdf', 'b.pdf'], master: { kind: 'file', path: 'm.xlsx' }, variant: 'EAN' });
    expect(results).toHaveLength(2);
    expect(results.map((r) => r.orderNumber)).toEqual(['4603418', '4603419']);
    expect(masterLoads).toBe(1); // maestro cargado una vez para todo el bloque
  });
});
