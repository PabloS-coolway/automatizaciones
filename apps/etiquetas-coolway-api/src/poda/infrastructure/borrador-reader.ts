import ExcelJS from 'exceljs';
import { LineaBorrador } from '../domain/poda';
import { normalizeRef } from '../domain/familia';

// Columnas del borrador de prepedidos (Hoja1). Verificado con `prepedidos 2003.xlsx`.
const COL_HORMA = 3; // código de color de SAP
const COL_OUR_REFERENCE = 7; // ref color-a-color (7 dígitos)
const COL_SUMA = 14; // pares comprados

function texto(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'object') {
    const o = v as { text?: string; result?: unknown };
    return String(o.text ?? o.result ?? '');
  }
  return String(v);
}

function numero(cell: ExcelJS.Cell): number {
  const v = cell.value;
  const n = typeof v === 'number' ? v : Number(String(texto(cell)).trim());
  return Number.isFinite(n) ? n : 0; // los continuativos traen la celda vacía o con espacios → 0
}

/** Lee el borrador de prepedidos → líneas (ref, color SAP, pares comprados). Salta la cabecera y filas sin ref. */
export async function leerBorrador(path: string): Promise<LineaBorrador[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(path);
  const ws = wb.worksheets[0];

  const lineas: LineaBorrador[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const ourRef = texto(ws.getRow(r).getCell(COL_OUR_REFERENCE)).trim();
    if (!normalizeRef(ourRef)) continue; // fila sin ref (cabecera, separadores) → no es dato
    lineas.push({
      ourRef,
      colorSap: texto(ws.getRow(r).getCell(COL_HORMA)).trim(),
      suma: numero(ws.getRow(r).getCell(COL_SUMA)),
    });
  }
  return lineas;
}
