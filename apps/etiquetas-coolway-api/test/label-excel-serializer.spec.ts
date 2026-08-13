import * as ExcelJS from 'exceljs';
import { LabelExcelSerializer } from '../src/infrastructure/excel/label-excel-serializer';
import { OrderLabels } from '../src/application/use-cases/generate-labels.use-case';

const IMPORTADO =
  'IMPORTADO Y FABRICADO POR VANYOR S.A. Carrer de Charles Robert Darwin, 34, 46980 Paterna, Valencia. NIF A96304134. import@coolway.com';

function labels(importadoPor?: string): OrderLabels {
  return {
    orderNumber: '4603372',
    variant: 'CODE128_EAN',
    importadoPor,
    rows: [
      { style: 'KARVA', color: 'BLK', ref: '7603550', size: '40', sku: '7603550-40', qty: 2, ean13: '8400000000001', code128: 'x', importadoPor },
    ],
    missing: [],
    reconciliation: { orderPairs: 2, labelPairs: 2, excludedPairs: 0, balanced: true, diff: 0, parsedBoxes: 1, matchesDeclared: true, missedPairs: 0 },
  };
}

async function columnaImportadoPor(buf: Buffer): Promise<Partial<ExcelJS.Column> | undefined> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
  const ws = wb.getWorksheet('Etiquetas')!;
  return ws.columns.find((c) => (c.values ?? []).includes('importado por'));
}

describe('LabelExcelSerializer · columna "importado por" se ajusta al texto', () => {
  it('con un texto legal largo, la columna es lo bastante ancha para verlo entero (dato nunca recortado)', async () => {
    const buf = await new LabelExcelSerializer().serialize(labels(IMPORTADO));
    const col = await columnaImportadoPor(buf);
    expect(col).toBeDefined();
    // Ancha para que quepa el texto (con el tope de 130), no la mísera de 16 de antes.
    expect(col!.width ?? 0).toBeGreaterThanOrEqual(IMPORTADO.length);
    // Y, lo esencial: el VALOR guardado está completo (con el NIF entero).
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as Parameters<typeof wb.xlsx.load>[0]);
    const fila2 = wb.getWorksheet('Etiquetas')!.getRow(2);
    expect(String(fila2.values).includes('A96304134')).toBe(true);
  });

  it('sin importado por, no aparece la columna (no rompe otros destinos)', async () => {
    const buf = await new LabelExcelSerializer().serialize(labels(undefined));
    expect(await columnaImportadoPor(buf)).toBeUndefined();
  });
});
