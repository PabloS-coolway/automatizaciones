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
/** Error de un borrador con una cabecera inesperada (columna esencial ausente). El controller lo traduce a 400. */
export class BorradorInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BorradorInvalidoError';
  }
}

/** Columnas del borrador, resueltas por su cabecera. `horma` = -1 si el borrador no trae esa columna. */
export interface ColumnasBorrador {
  ourRef: number;
  horma: number;
  suma: number;
}

/** Normaliza un texto de cabecera para comparar: recorta, minúsculas, colapsa espacios y quita acentos. */
function normalizaCabecera(s: string | undefined): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

/**
 * BUG-009 · Localiza las columnas del borrador **por su cabecera**, no por una posición fija. El nº de columnas
 * de talla varía entre modelos/marcas: en Coolway aparecen S46/Z y "Suma" cae en la col 14; en otros ficheros
 * (p.ej. Ulanka) no están y "Suma" cae en la 12. Con una posición fija, la poda leía una columna vacía y
 * devolvía **0 compras → 0 conservadas EN SILENCIO**. Ahora, si falta una columna esencial, se AVISA en vez de
 * mentir. `Our Reference` y `Suma` son obligatorias; `Horma` es opcional (su ausencia/vacío ya lo trata BUG-006).
 */
export function localizarColumnas(cabeceras: (string | undefined)[]): ColumnasBorrador {
  const buscar = (nombre: string): number => {
    const objetivo = normalizaCabecera(nombre);
    for (let c = 1; c < cabeceras.length; c++) {
      if (normalizaCabecera(cabeceras[c]) === objetivo) return c;
    }
    return -1;
  };
  const ourRef = buscar('Our Reference');
  const suma = buscar('Suma');
  const horma = buscar('Horma');
  const faltan = [ourRef < 0 ? '«Our Reference»' : null, suma < 0 ? '«Suma»' : null].filter(Boolean);
  if (faltan.length > 0) {
    throw new BorradorInvalidoError(
      `El borrador no tiene la(s) columna(s) ${faltan.join(' y ')} en su cabecera. Revisa que es el fichero de prepedidos correcto.`,
    );
  }
  return { ourRef, horma, suma };
}

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

  // Cabeceras (fila 1) indexadas por número de columna (1-based), para localizar las columnas por su nombre.
  const cabeceras: (string | undefined)[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, col) => {
    cabeceras[col] = texto(cell);
  });
  const cols = localizarColumnas(cabeceras);

  const lineas: LineaBorrador[] = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const ourRef = texto(ws.getRow(r).getCell(cols.ourRef)).trim();
    if (!normalizeRef(ourRef)) continue; // fila sin ref (cabecera, separadores) → no es dato
    lineas.push({
      ourRef,
      colorSap: cols.horma > 0 ? texto(ws.getRow(r).getCell(cols.horma)).trim() : '',
      suma: numero(ws.getRow(r).getCell(cols.suma)),
    });
  }
  return lineas;
}
