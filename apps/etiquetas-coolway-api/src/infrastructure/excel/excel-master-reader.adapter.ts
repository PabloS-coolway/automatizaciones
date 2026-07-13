import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { MasterReaderPort } from '../../application/ports/master-reader.port';
import { MasterReference } from '../../domain/model/reference';

type Campo = 'name' | 'color' | 'ref' | 'size' | 'ean13' | 'sku' | 'colorWeb' | 'upc';
type ColMap = Partial<Record<Campo, number>>;

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, ' ');

/** A qué campo corresponde cada cabecera del Excel. */
function campoDe(cabecera: string): Campo | undefined {
  switch (cabecera) {
    case 'NAME':
    case 'STYLE':
      return 'name'; // el maestro usa NAME o STYLE según la hoja
    case 'COLOR':
      return 'color';
    case 'REF.':
    case 'REF':
      return 'ref';
    case 'SIZE':
      return 'size';
    case 'EAN 13':
    case 'EAN13':
      return 'ean13';
    case 'SKU':
      return 'sku';
    case 'COLOR NAME WEB':
      return 'colorWeb';
    case 'UPC':
      return 'upc';
    default:
      return undefined;
  }
}

/** Cuántas celdas con valor tiene una columna (para desempatar cabeceras repetidas). */
function celdasConValor(ws: ExcelJS.Worksheet, col: number): number {
  let n = 0;
  ws.eachRow((row, i) => {
    if (i > 1 && String(row.getCell(col).text ?? '').trim() !== '') n++;
  });
  return n;
}

/**
 * Cómo se desempata una cabecera REPETIDA. El maestro las tiene, y elegir mal vacía un campo entero
 * **sin avisar de nada**:
 *
 *   · `UPC` → **siempre la PRIMERA** (regla confirmada por Silvia). En la hoja `GOAL` hay dos: la H
 *     (985 códigos, la buena) y la N, que pertenece a otra subtabla pegada a la derecha —la de las
 *     filas con `GOAL HI` en la columna K— y **no es válida**. Se cogía la última, así que sólo
 *     entraban 28 UPC de 1.343: los pedidos de USA salían con "falta el UPC" aunque el Excel lo tuviera.
 *
 *   · resto → la que **más datos** tenga, avisando. En la hoja `ROPA` hay dos `SIZE`: la 4 con un
 *     código interno (11, 12, 13…) y la 6 con la talla real (S, M, L, XL) — ahí la buena es la última.
 *     Como no hay regla confirmada, se elige la que tiene valores y se reporta para poder preguntarlo.
 */
const DESEMPATE: Partial<Record<Campo, 'primera'>> = { upc: 'primera' };

function mapHeader(ws: ExcelJS.Worksheet): ColMap {
  const candidatas = new Map<Campo, number[]>();
  ws.getRow(1).eachCell((cell, col) => {
    const campo = campoDe(norm(String(cell.text ?? '')));
    if (!campo) return;
    candidatas.set(campo, [...(candidatas.get(campo) ?? []), col]);
  });

  const map: ColMap = {};
  for (const [campo, cols] of candidatas) {
    if (cols.length === 1) {
      map[campo] = cols[0];
      continue;
    }

    const conteos = cols.map((col) => ({ col, n: celdasConValor(ws, col) }));
    const elegida =
      DESEMPATE[campo] === 'primera' ? conteos[0] : conteos.reduce((a, b) => (b.n > a.n ? b : a));

    map[campo] = elegida.col;
    console.warn(
      `[maestro] La hoja "${ws.name}" repite la cabecera del campo "${campo}" en las columnas ` +
        `${conteos.map((c) => `${c.col} (${c.n} valores)`).join(' y ')}. Se usa la ${elegida.col}` +
        `${DESEMPATE[campo] === 'primera' ? ' (la primera: regla de negocio)' : ' (la que tiene datos)'}. ` +
        `Conviene corregir el Excel.`,
    );
  }
  return map;
}

const text = (row: ExcelJS.Row, col?: number): string | undefined => {
  if (!col) return undefined;
  const v = String(row.getCell(col).text ?? '').trim();
  return v === '' ? undefined : v;
};

/**
 * Adapter de entrada: Excel `REFERENCIAS COOLWAY` (una hoja por modelo) → MasterReference[].
 * Mapea por nombre de cabecera (robusto a columnas extra). Salta hojas sin REF./SIZE.
 * ⚠️ Coacciona celdas a texto; si algún EAN/UPC se guardara como número con ceros a la
 * izquierda, se perderían (no es el caso en las muestras). Revisar al gobernar el maestro.
 */
@Injectable()
export class ExcelMasterReader implements MasterReaderPort {
  async read(source: string): Promise<MasterReference[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(source);

    const out: MasterReference[] = [];
    for (const ws of wb.worksheets) {
      const cols = mapHeader(ws);
      if (!cols.ref || !cols.size || !cols.name || !cols.color) continue;

      ws.eachRow((row, n) => {
        if (n === 1) return;
        const style = text(row, cols.name);
        const color = text(row, cols.color);
        const ref = text(row, cols.ref);
        const size = text(row, cols.size);
        if (!style || !color || !ref || !size) return;

        out.push({
          style,
          color,
          ref,
          size,
          ean13: text(row, cols.ean13),
          upc: text(row, cols.upc),
          sku: text(row, cols.sku),
          colorNameWeb: text(row, cols.colorWeb),
        });
      });
    }
    return out;
  }
}
