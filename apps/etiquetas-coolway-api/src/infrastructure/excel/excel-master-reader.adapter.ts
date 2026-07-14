import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { MasterReaderPort } from '../../application/ports/master-reader.port';
import { MasterReference } from '../../domain/model/reference';

type Campo = 'name' | 'color' | 'ref' | 'size' | 'tallaSap' | 'tallaTiendas' | 'ean13' | 'sku' | 'colorWeb' | 'upc';
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
    case 'TALLA SAP':
      return 'tallaSap'; // REQ-003: la talla que viene en el PDF del pedido
    case 'TALLA TIENDAS':
      return 'tallaTiendas'; // REQ-003: la talla que va al código de barras
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

/**
 * ⚠️ EXCEPCIÓN · La hoja `ROPA` tiene los rótulos mal puestos (los DATOS son correctos):
 *
 *   ROPA        D="SIZE"→11   E=(sin título)→31   F="SIZE"→S   G=EAN 13   H="TALLA TIENDAS"→(vacía)
 *   CALCETINES  D="SIZE"→36-38  E="TALLA SAP"→31  F=EAN 13     G="TALLA TIENDAS"→11
 *
 * O sea: la columna que dice `TALLA TIENDAS` está vacía y el `11` vive en una que se llama `SIZE`.
 * Un humano lo lee bien; el programa no puede adivinarlo por el nombre. Se resuelve por CONTENIDO:
 *   · de las dos columnas `SIZE`, la que trae letras (`S`, `M`, `XL`) es la que se imprime;
 *   · la otra (numérica, 11-14) es la talla tiendas;
 *   · y la columna sin rótulo que hay entre medias (31-34) es la talla SAP.
 *
 * El día que se normalicen las cabeceras, este parche deja de aplicarse solo: las tres se mapean
 * por nombre como en `CALCETINES` y `BOLSAS`. Mientras tanto, se avisa en cada carga.
 */
function parcheHojaRopa(ws: ExcelJS.Worksheet, map: ColMap, dupsSize: number[]): void {
  // OJO: `ROPA` SÍ tiene la cabecera `TALLA TIENDAS`; lo que pasa es que su columna está VACÍA.
  // Por eso no basta con mirar si el rótulo existe: hay que mirar si trae datos.
  const tiendasVacia = map.tallaTiendas === undefined || celdasConValor(ws, map.tallaTiendas) === 0;
  if (dupsSize.length !== 2 || !tiendasVacia) return;

  const [a, b] = dupsSize;
  const conLetras = (col: number) => {
    let letras = 0;
    ws.eachRow((row, i) => {
      if (i > 1 && /[A-Za-z]/.test(String(row.getCell(col).text ?? ''))) letras++;
    });
    return letras;
  };

  // La que se imprime es la que trae letras (S/M/L/XL); la otra es el código de tiendas.
  const [impresa, tiendas] = conLetras(a) > conLetras(b) ? [a, b] : [b, a];
  map.size = impresa;
  map.tallaTiendas = tiendas;

  // La talla SAP es la columna SIN rótulo que queda entre las dos.
  const enMedio = Math.min(a, b) + 1;
  if (enMedio < Math.max(a, b) && !Object.values(map).includes(enMedio)) map.tallaSap = enMedio;

  console.warn(
    `[maestro] La hoja "${ws.name}" tiene los rótulos de talla mal puestos (la columna "TALLA TIENDAS" ` +
      `está vacía y el código vive bajo "SIZE"). Se leen por contenido: imprime=col ${map.size}, ` +
      `tiendas=col ${map.tallaTiendas}, SAP=col ${map.tallaSap ?? '?'}. Conviene rotularla como CALCETINES.`,
  );
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

  // La hoja ROPA repite `SIZE` y deja `TALLA TIENDAS` vacía: se resuelve por contenido (ver arriba).
  parcheHojaRopa(ws, map, candidatas.get('size') ?? []);
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
          size, // la que se IMPRIME
          tallaSap: text(row, cols.tallaSap), // la que viene en el PDF (vacía en calzado)
          tallaTiendas: text(row, cols.tallaTiendas), // la del CÓDIGO DE BARRAS (vacía en calzado)
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
