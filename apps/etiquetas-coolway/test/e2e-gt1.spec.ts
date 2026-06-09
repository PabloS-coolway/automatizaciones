import { join } from 'node:path';
import { buildLabels } from '../src/domain/services/label-builder';
import { MasterIndex } from '../src/domain/services/master-index';
import { reconcile } from '../src/domain/services/reconciliation';
import { ExcelMasterReader } from '../src/infrastructure/excel/excel-master-reader.adapter';
import { PdfOrderReader } from '../src/infrastructure/pdf/pdf-order-reader.adapter';

const DOCS = join(__dirname, '..', '..', '..', 'docs', 'requerimientos');
const PDF = join(DOCS, '4603418.pdf');
const MASTER = join(DOCS, 'REFERENCIAS COOLWAY.xlsx');

/**
 * GT-1 end-to-end contra los FICHEROS REALES: lee el PDF y el maestro de verdad,
 * y comprueba que reproduce la salida que Silvia validó (etiquetas_4603418).
 */
describe('E2E GT-1 (ficheros reales)', () => {
  jest.setTimeout(30000);

  it('reproduce la salida validada de NILO BRW (60 pares, 7 tallas, códigos correctos)', async () => {
    const order = await new PdfOrderReader().read(PDF);
    const masterRows = await new ExcelMasterReader().read(MASTER);
    const master = new MasterIndex(masterRows);

    const { rows, missing } = buildLabels(order, master, 'UPC_EAN');
    const rec = reconcile(order, rows);

    expect(missing).toHaveLength(0);
    expect(rec).toMatchObject({ orderPairs: 60, labelPairs: 60, balanced: true });
    expect(rows).toHaveLength(7);
    expect(rows.map((r) => r.qty)).toEqual([4, 8, 14, 16, 10, 5, 3]);

    // Códigos reales leídos del maestro (no inventados)
    expect(rows[0]).toMatchObject({
      style: 'NILO', color: 'BRW', ref: '7643398', size: '36',
      ean13: '8433852642814', upc: '843385236998',
    });
    expect(rows[6]).toMatchObject({ size: '42', ean13: '8433852648021', upc: '843385237056' });
  });

  it('procesa un 2º pedido real (4603434 NILO YEL, USA): 6 tallas, 60 pares, sin faltantes', async () => {
    const order = await new PdfOrderReader().read(join(DOCS, '4603434.pdf'));
    const master = new MasterIndex(await new ExcelMasterReader().read(MASTER));

    const { rows, missing } = buildLabels(order, master, 'UPC_EAN', 'COOLWAY USA');
    const rec = reconcile(order, rows);

    expect(missing).toHaveLength(0);
    expect(rec).toMatchObject({ orderPairs: 60, labelPairs: 60, balanced: true });
    expect(rows).toHaveLength(6);
    expect(rows[0]).toMatchObject({
      style: 'NILO', color: 'YEL', ref: '7693398', size: '36',
      ean13: '8433852623431', upc: '843385231078', importadoPor: 'COOLWAY USA',
    });
  });
});
