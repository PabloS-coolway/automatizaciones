import * as ExcelJS from 'exceljs';
import { ReferenceDto } from '@yorga/contracts';
import { MaestroExcelSerializer } from '../src/maestro/infrastructure/maestro-excel-serializer';

const FILAS: ReferenceDto[] = [
  { style: 'GOAL', color: 'RED', ref: '7603298', size: '40', sku: '7603298-40', ean13: '8433852502965', upc: '843385227637', colorNameWeb: 'Rojo' },
  { style: 'BECKS', color: 'BLK', ref: '8603588', size: '42', sku: '8603588-42', ean13: null, upc: null, colorNameWeb: null },
];

/** Vuelve a abrir el Excel generado: se comprueba el fichero de verdad, no el objeto en memoria. */
async function leer(buf: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf as unknown as ExcelJS.Buffer);
  return wb.getWorksheet('Maestro')!;
}

describe('MaestroExcelSerializer', () => {
  const s = new MaestroExcelSerializer();

  it('escribe cabecera y una fila por referencia', async () => {
    const hoja = await leer(await s.serialize(FILAS));

    expect(hoja.getRow(1).values).toEqual(
      expect.arrayContaining(['modelo', 'color', 'ref.', 'talla', 'SKU', 'ean13', 'upc', 'color web']),
    );
    expect(hoja.rowCount).toBe(3); // cabecera + 2 filas
    expect(hoja.getRow(2).getCell(1).value).toBe('GOAL');
    expect(hoja.getRow(2).getCell(6).value).toBe('8433852502965');
  });

  it('los códigos se escriben como TEXTO (si no, Excel corrompe el EAN13)', async () => {
    // Un EAN13 interpretado como número sale en notación científica (8,43385E+12) y un código con
    // ceros a la izquierda los pierde. Exportar corrompiendo el dato es peor que no exportar.
    const hoja = await leer(await s.serialize(FILAS));
    const fila = hoja.getRow(2);

    // Se comprueba sobre el fichero REABIERTO: el numFmt de columna no sobrevive al guardado.
    expect(fila.getCell(6).numFmt).toBe('@'); // ean13
    expect(fila.getCell(7).numFmt).toBe('@'); // upc
    expect(fila.getCell(3).numFmt).toBe('@'); // ref
    expect(typeof fila.getCell(6).value).toBe('string');
  });

  it('un código que falta se escribe vacío, nunca se inventa', async () => {
    const hoja = await leer(await s.serialize(FILAS));
    const fila = hoja.getRow(3); // BECKS, sin ean13 ni upc

    expect(fila.getCell(6).value ?? '').toBe('');
    expect(fila.getCell(7).value ?? '').toBe('');
  });

  it('deja el autofiltro puesto: quien abra el fichero puede seguir filtrando en Excel', async () => {
    const hoja = await leer(await s.serialize(FILAS));
    expect(hoja.autoFilter).toBeTruthy();
  });

  it('sin filas, genera un Excel válido sólo con la cabecera (no revienta)', async () => {
    const hoja = await leer(await s.serialize([]));
    expect(hoja.rowCount).toBe(1);
  });

  it('el nombre dice si la vista estaba filtrada y lleva la fecha', () => {
    const dia = new Date('2026-07-13T10:00:00Z');
    expect(s.fileName(false, dia)).toBe('maestro-coolway-2026-07-13.xlsx');
    expect(s.fileName(true, dia)).toBe('maestro-coolway-filtrado-2026-07-13.xlsx');
  });
});
