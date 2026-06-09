import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { OrderLabels } from '../../application/use-cases/generate-labels.use-case';

/**
 * Serializa las etiquetas de un pedido a un Excel (Buffer), reutilizable por CLI y HTTP.
 * Formato simplificado confirmado por Silvia (DEP-06): columnas de código dinámicas según variante.
 */
@Injectable()
export class LabelExcelSerializer {
  async serialize(labels: OrderLabels): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Etiquetas');
    const has = (key: keyof OrderLabels['rows'][number]) =>
      labels.rows.some((r) => r[key] != null && r[key] !== '');

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
    for (const r of labels.rows) sheet.addRow(r);

    const rec = labels.reconciliation;
    const resumen = wb.addWorksheet('Resumen');
    resumen.addRow(['Pedido', labels.orderNumber]);
    resumen.addRow(['Variante', labels.variant]);
    if (labels.importadoPor) resumen.addRow(['Importado por', labels.importadoPor]);
    resumen.addRow(['Pares pedido', rec.orderPairs]);
    resumen.addRow(['Pares salida', rec.labelPairs]);
    resumen.addRow(['Cuadra', rec.balanced ? 'SÍ' : `NO (desfase ${rec.diff})`]);
    if (labels.missing.length) {
      resumen.addRow([]);
      resumen.addRow(['Códigos faltantes', labels.missing.length]);
      for (const m of labels.missing) resumen.addRow([`${m.style} ${m.color} ${m.size}`, m.reason]);
    }

    const out = await wb.xlsx.writeBuffer();
    return Buffer.from(out);
  }

  /** Nombre de fichero sugerido para un pedido. */
  fileName(labels: OrderLabels): string {
    return `etiquetas_${labels.orderNumber}_${labels.variant}.xlsx`;
  }
}
