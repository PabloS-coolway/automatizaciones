import * as ExcelJS from 'exceljs';
import { CodeRow } from '../domain/codes';
import { CodesFileReader } from '../application/ports';

const norm = (s: string) => s.trim().toUpperCase();
const text = (row: ExcelJS.Row, col?: number) => (col ? String(row.getCell(col).text ?? '').trim() : '');

/** Adapter: lee un export de prepedidos (MODELO, COLOR, REF, SIZE, EAN|UPC). */
export class ExcelCodesReader implements CodesFileReader {
  async read(source: string, codeColumn: 'EAN' | 'UPC'): Promise<CodeRow[]> {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(source);
    const ws = wb.worksheets[0];

    const idx: Record<string, number> = {};
    ws.getRow(1).eachCell((cell, col) => {
      idx[norm(String(cell.text ?? ''))] = col;
    });
    const cRef = idx['REF'];
    const cSize = idx['SIZE'];
    const cCode = idx[codeColumn];
    const cStyle = idx['MODELO'] ?? idx['NAME'] ?? idx['STYLE'];
    const cColor = idx['COLOR'];
    if (!cRef || !cSize || !cCode) {
      throw new Error(`El fichero no tiene columnas REF/SIZE/${codeColumn}.`);
    }

    const out: CodeRow[] = [];
    ws.eachRow((row, n) => {
      if (n === 1) return;
      const ref = text(row, cRef);
      const size = text(row, cSize);
      const code = text(row, cCode);
      if (!ref || !size || !code) return;
      out.push({ style: text(row, cStyle), color: text(row, cColor), ref, size, code });
    });
    return out;
  }
}
