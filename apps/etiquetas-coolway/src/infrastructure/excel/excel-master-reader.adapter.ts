import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { MasterReaderPort } from '../../application/ports/master-reader.port';
import { MasterReference } from '../../domain/model/reference';

type ColMap = Partial<Record<'name' | 'color' | 'ref' | 'size' | 'ean13' | 'sku' | 'colorWeb' | 'upc', number>>;

const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, ' ');

function mapHeader(row: ExcelJS.Row): ColMap {
  const map: ColMap = {};
  row.eachCell((cell, col) => {
    switch (norm(String(cell.text ?? ''))) {
      case 'NAME': case 'STYLE': map.name = col; break; // el maestro usa NAME o STYLE según la hoja
      case 'COLOR': map.color = col; break;
      case 'REF.': case 'REF': map.ref = col; break;
      case 'SIZE': map.size = col; break;
      case 'EAN 13': case 'EAN13': map.ean13 = col; break;
      case 'SKU': map.sku = col; break;
      case 'COLOR NAME WEB': map.colorWeb = col; break;
      case 'UPC': map.upc = col; break;
    }
  });
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
      const cols = mapHeader(ws.getRow(1));
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
