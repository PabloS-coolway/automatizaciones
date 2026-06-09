import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { LabelFile, LabelWriterPort } from '../../application/ports/label-writer.port';

/**
 * Adapter de salida: escribe el fichero de etiquetas en Excel.
 * ⚠️ Layout PROVISIONAL (formato "B" simplificado, el que validó Silvia). El layout final
 * depende de DEP-06 (pregunta 7 a Silvia); cambiarlo afecta SOLO a este adapter.
 */
@Injectable()
export class ExcelLabelWriter implements LabelWriterPort {
  async write(file: LabelFile, destination: string): Promise<void> {
    const wb = new ExcelJS.Workbook();

    const sheet = wb.addWorksheet('Etiquetas');
    const has = (key: keyof (typeof file.rows)[number]) => file.rows.some((r) => r[key] != null && r[key] !== '');

    // Columnas dinámicas: solo las de código presentes en la variante (DEP-06).
    sheet.columns = [
      { header: 'style', key: 'style', width: 12 },
      { header: 'color', key: 'color', width: 8 },
      { header: 'ref.', key: 'ref', width: 12 },
      { header: 'talla', key: 'size', width: 7 },
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'QTY', key: 'qty', width: 7 },
      ...(has('ean13') ? [{ header: 'ean13', key: 'ean13', width: 16 }] : []),
      ...(has('upc') ? [{ header: 'upc', key: 'upc', width: 16 }] : []),
      ...(has('code128') ? [{ header: 'code128', key: 'code128', width: 18 }] : []),
      ...(has('importadoPor') ? [{ header: 'importado por', key: 'importadoPor', width: 16 }] : []),
    ];
    for (const r of file.rows) sheet.addRow(r);

    const resumen = wb.addWorksheet('Resumen');
    resumen.addRow(['Pedido', file.orderNumber]);
    resumen.addRow(['Pares pedido', file.reconciliation.orderPairs]);
    resumen.addRow(['Pares salida', file.reconciliation.labelPairs]);
    resumen.addRow(['Cuadra', file.reconciliation.balanced ? 'SÍ' : `NO (desfase ${file.reconciliation.diff})`]);

    await wb.xlsx.writeFile(destination);
  }
}
