import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as ExcelJS from 'exceljs';
import { ExcelMasterReader } from '../src/infrastructure/excel/excel-master-reader.adapter';

/** Escribe un Excel temporal con las hojas y filas que se le pasen. */
async function excelCon(hojas: { nombre: string; filas: (string | number)[][] }[]): Promise<string> {
  const wb = new ExcelJS.Workbook();
  for (const h of hojas) {
    const ws = wb.addWorksheet(h.nombre);
    h.filas.forEach((f) => ws.addRow(f));
  }
  const dir = mkdtempSync(join(tmpdir(), 'maestro-'));
  const file = join(dir, 'maestro.xlsx');
  await wb.xlsx.writeFile(file);
  return file;
}

describe('ExcelMasterReader · cabeceras REPETIDAS en el maestro', () => {
  const reader = new ExcelMasterReader();
  let tmp: string[] = [];
  afterAll(() => tmp.forEach((f) => rmSync(join(f, '..'), { recursive: true, force: true })));

  it('UPC repetido → se usa la PRIMERA columna (regla de Silvia), no la última', async () => {
    /**
     * El caso real de la hoja GOAL: la columna H trae el UPC bueno y, pegada a la derecha, hay otra
     * subtabla (las filas con "GOAL HI") que repite la cabecera UPC. Antes ganaba la última y sólo
     * entraban 28 UPC de 1.343: los pedidos de USA salían con "falta el UPC" pese a estar en el Excel.
     */
    const file = await excelCon([
      {
        nombre: 'GOAL',
        filas: [
          ['NAME', 'COLOR', 'REF.', 'SIZE', 'EAN 13', 'SKU', 'COLOR NAME WEB', 'UPC', 'X', 'GOAL HI', 'UPC'],
          ['GOAL', 'BGE', '7613551', '36', '8433852659973', '7613551-36', 'SKY LINE', '843385251199', '', '', ''],
          ['GOAL', 'BGE', '7613551', '37', '8433852659980', '7613551-37', 'SKY LINE', '843385251205', '', '', '999999999999'],
        ],
      },
    ]);
    tmp.push(file);

    const filas = await reader.read(file);
    expect(filas).toHaveLength(2);
    expect(filas[0].upc).toBe('843385251199'); // el de la PRIMERA columna
    expect(filas[1].upc).toBe('843385251205'); // …aunque la segunda traiga otro valor
  });

  it('otras cabeceras repetidas → gana la que tiene datos (caso SIZE de la hoja ROPA)', async () => {
    // En ROPA, `SIZE` está dos veces: un código interno (11, 12…) y la talla real (S, M, L).
    const file = await excelCon([
      {
        nombre: 'ROPA',
        filas: [
          ['STYLE', 'COLOR', 'REF.', 'SIZE', 'EAN 13', 'SIZE'],
          ['RACER', 'BLK', '9008524', '', '8433852000001', 'S'],
          ['RACER', 'BLK', '9008524', '', '8433852000002', 'M'],
        ],
      },
    ]);
    tmp.push(file);

    const filas = await reader.read(file);
    expect(filas.map((f) => f.size)).toEqual(['S', 'M']);
  });

  it('sin cabeceras repetidas, todo sigue igual', async () => {
    const file = await excelCon([
      {
        nombre: 'NILO',
        filas: [
          ['NAME', 'COLOR', 'REF.', 'SIZE', 'EAN 13', 'UPC'],
          ['NILO', 'RED', '7603398', '40', '8433852000010', '843385200001'],
        ],
      },
    ]);
    tmp.push(file);

    const [fila] = await reader.read(file);
    expect(fila).toMatchObject({ style: 'NILO', color: 'RED', ref: '7603398', size: '40', upc: '843385200001' });
  });
});
