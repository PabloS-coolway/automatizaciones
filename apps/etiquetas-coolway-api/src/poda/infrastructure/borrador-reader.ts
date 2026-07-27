import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import { unzipSync, zipSync } from 'fflate';
import { LineaBorrador } from '../domain/poda';
import { normalizeRef } from '../domain/familia';

/**
 * BUG-007 · Abre el Excel del borrador de forma tolerante. Algunos ficheros **válidos** (según cómo los
 * guarda cierta versión/flujo de Excel) traen un ZIP que la librería interna de exceljs (jszip) no sabe abrir
 * —"Can't find end of central directory"— aunque el contenido es correcto. En ese caso se re-normaliza el zip
 * con `fflate` (más tolerante) y se reintenta. El contenido NO se toca: es la misma hoja, sólo re-empaquetada.
 */
async function abrirWorkbook(path: string): Promise<ExcelJS.Workbook> {
  try {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(path);
    return wb;
  } catch {
    const entradas = unzipSync(new Uint8Array(await readFile(path)));
    const wb = new ExcelJS.Workbook();
    // El valor es un Buffer real en runtime; el cast salva el choque de tipos genéricos de `Buffer` (Node).
    await wb.xlsx.load(Buffer.from(zipSync(entradas)) as unknown as Parameters<typeof wb.xlsx.load>[0]);
    return wb;
  }
}

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
  const wb = await abrirWorkbook(path);
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
