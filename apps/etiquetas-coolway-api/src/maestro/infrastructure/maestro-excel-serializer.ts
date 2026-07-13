import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { ReferenceDto } from '@yorga/contracts';

/**
 * Serializa una vista del maestro a Excel (REQ-002 fase 4).
 *
 * Se genera en el SERVIDOR, no en el navegador: exportar "lo filtrado" puede ser el maestro entero
 * (5.736 filas), y traérselo al front sólo para volcarlo a un fichero es tirar datos por la red para
 * nada. Además reaprovecha `exceljs`, que ya se usa para las etiquetas.
 *
 * ⚠️ Los códigos se escriben como TEXTO. Si se dejara que Excel los interprete como números, un EAN13
 * saldría en notación científica y un código con ceros a la izquierda los perdería: sería corromper
 * el dato al exportarlo.
 */
@Injectable()
export class MaestroExcelSerializer {
  async serialize(rows: ReferenceDto[]): Promise<Buffer> {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Maestro');

    sheet.columns = [
      { header: 'modelo', key: 'style', width: 14 },
      { header: 'color', key: 'color', width: 9 },
      { header: 'ref.', key: 'ref', width: 12 },
      { header: 'talla', key: 'size', width: 7 },
      { header: 'SKU', key: 'sku', width: 16 },
      { header: 'ean13', key: 'ean13', width: 16 },
      { header: 'upc', key: 'upc', width: 15 },
      { header: 'color web', key: 'colorNameWeb', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.views = [{ state: 'frozen', ySplit: 1 }]; // la cabecera se queda fija al hacer scroll

    /** Columnas de código: se marcan como texto CELDA A CELDA. */
    const TEXTO = ['ref', 'sku', 'ean13', 'upc'];

    for (const r of rows) {
      const fila = sheet.addRow({
        style: r.style,
        color: r.color,
        ref: r.ref,
        size: r.size,
        sku: r.sku,
        ean13: r.ean13 ?? '',
        upc: r.upc ?? '',
        colorNameWeb: r.colorNameWeb ?? '',
      });
      // '@' = formato texto. Hay que ponerlo en la CELDA: el `numFmt` de columna no se guarda en el
      // fichero (se pierde al abrirlo), y entonces Excel volvería a tratar el EAN13 como número.
      for (const key of TEXTO) fila.getCell(key).numFmt = '@';
    }

    // Autofiltro de Excel sobre la cabecera: quien abra el fichero sigue pudiendo filtrar allí.
    if (rows.length) {
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } };
    }

    return Buffer.from(await wb.xlsx.writeBuffer());
  }

  /** `maestro-coolway-2026-07-13.xlsx`, o con sufijo si la vista está filtrada. */
  fileName(filtrada: boolean, hoy: Date): string {
    const fecha = hoy.toISOString().slice(0, 10);
    return `maestro-coolway${filtrada ? '-filtrado' : ''}-${fecha}.xlsx`;
  }
}
