import { MasterReference } from '../src/domain/model/reference';
import { PurchaseOrder } from '../src/domain/model/order';
import { buildCode128 } from '../src/domain/services/code128';
import { MasterIndex } from '../src/domain/services/master-index';
import { MODELOS_EXCLUIDOS, buildLabels } from '../src/domain/services/label-builder';
import { assortmentTotalPairs, expandAssortment } from '../src/domain/services/assortment-catalog';
import { reconcile } from '../src/domain/services/reconciliation';

/**
 * REQ-003 · Un SKU tiene hasta TRES tallas y confundirlas imprime el código de barras de OTRO
 * producto: en tienda se cobraría lo que no es.
 *
 *   familia      | tallaSap (PDF) | tallaTiendas (código) | size (se imprime)
 *   calzado      | 40             | 40                    | 40
 *   ropa         | 31             | 11                    | S
 *   calcetines   | 31             | 11                    | 36-38
 *   bolsas       | C01            | 35                    | U
 */

const ropa: MasterReference = {
  style: 'ICONIC', color: 'BLK', ref: '9008767',
  size: 'S', tallaSap: '31', tallaTiendas: '11',
  ean13: '8433852617072', upc: '843385226845', sku: '9008767-S',
};
const calcetin: MasterReference = {
  style: 'ZEBRA', color: 'BLK', ref: '9308226',
  size: '36-38', tallaSap: '31', tallaTiendas: '11',
  ean13: '8433852600001', sku: '9308226-36-38',
};
const gorra: MasterReference = {
  style: 'SYA CAP', color: 'RED', ref: '556596', // ref de 6 dígitos
  size: 'U', tallaSap: 'C01', tallaTiendas: '35',
  ean13: '8433852613821', sku: '556596-U',
};
const zapato: MasterReference = {
  style: 'NILO', color: 'RED', ref: '7603398', size: '40', // sin tallaSap/tallaTiendas: calzado
  ean13: '8433852000010', sku: '7603398-40',
};

const pedido = (style: string, color: string, refSap: string, assortment: string, boxes = 1): PurchaseOrder => ({
  orderNumber: 'X',
  lines: [{ style, color, refSap, assortment, boxes }],
});

describe('buildCode128 · RN-02 con las reglas de REQ-003', () => {
  it('calzado: la ref de 7 dígitos y la talla, como siempre', () => {
    expect(buildCode128('7623425', '36')).toBe('76234250000036');
  });

  it('la ref con un dígito de menos lleva un CERO DELANTE (regla de Silvia)', () => {
    // La mochila 308280 -> 0308280. Lo confirma SAP: en el PDF su ref viene como 03082800000C01.
    expect(buildCode128('308280', '35')).toBe('03082800000035');
    expect(buildCode128('308280', '35')).toHaveLength(14);
  });

  it('lleva la TALLA TIENDAS, nunca la que se imprime', () => {
    // Si entrara la talla impresa saldría "...0000S": un código inválido, etiqueta inservible.
    expect(buildCode128('9008767', '11')).toBe('90087670000011');
  });
});

describe('MasterIndex · se busca por la talla del PDF (tallaSap)', () => {
  it('la ropa se encuentra con el 31 que trae el PDF, no con la S que se imprime', () => {
    const idx = new MasterIndex([ropa]);
    expect(idx.find('ICONIC', 'BLK', '31', 'W')?.size).toBe('S');
    expect(idx.find('ICONIC', 'BLK', 'S', 'W')).toBeUndefined(); // el PDF nunca dice "S"
  });

  it('el calzado sigue buscándose por su talla de siempre', () => {
    const idx = new MasterIndex([zapato]);
    expect(idx.find('NILO', 'RED', '40', 'W')?.ean13).toBe('8433852000010');
  });

  it('ropa y calcetines comparten la talla SAP 31 pero imprimen cosas distintas', () => {
    const idx = new MasterIndex([ropa, calcetin]);
    expect(idx.find('ICONIC', 'BLK', '31', 'W')?.size).toBe('S');
    expect(idx.find('ZEBRA', 'BLK', '31', 'W')?.size).toBe('36-38');
  });
});

describe('expandAssortment · surtidos de estas familias', () => {
  it('S31 (ropa/calcetines) → 1 unidad de la talla SAP 31', () => {
    expect(expandAssortment('S31').pairs).toEqual({ '31': 1 });
  });

  it('C01 (bolsas) → 1 unidad de talla única; el código ES la talla SAP', () => {
    expect(expandAssortment('C01').pairs).toEqual({ C01: 1 });
    expect(assortmentTotalPairs('C01')).toBe(1);
  });
});

describe('buildLabels · la etiqueta imprime una talla y el código lleva otra', () => {
  it('ROPA: imprime S, el CODE128 lleva 11', () => {
    const { rows, missing } = buildLabels(
      pedido('ICONIC', 'BLK', '90087670000S31', 'S31', 40),
      new MasterIndex([ropa]),
      'CODE128_EAN',
    );

    expect(missing).toHaveLength(0);
    expect(rows[0].size).toBe('S'); // lo que se IMPRIME
    expect(rows[0].code128).toBe('90087670000011'); // lo que va al CÓDIGO
    expect(rows[0].qty).toBe(40); // 40 cajas × 1 unidad
  });

  it('CALCETINES: imprime 36-38, el CODE128 lleva 11', () => {
    const { rows } = buildLabels(
      pedido('ZEBRA', 'BLK', '93082260000S31', 'S31'),
      new MasterIndex([calcetin]),
      'CODE128_EAN',
    );
    expect(rows[0].size).toBe('36-38');
    expect(rows[0].code128).toBe('93082260000011');
  });

  it('BOLSAS: imprime U, el CODE128 lleva 35 y la ref corta va con cero delante', () => {
    const { rows } = buildLabels(
      pedido('SYA CAP', 'RED', '05565960000C01', 'C01', 10),
      new MasterIndex([gorra]),
      'CODE128_EAN',
    );
    expect(rows[0].size).toBe('U');
    expect(rows[0].code128).toBe('05565960000035'); // 556596 -> 0556596
  });

  it('CALZADO: nada cambia (las tres tallas son la misma)', () => {
    const { rows } = buildLabels(
      pedido('NILO', 'RED', '76033980200S40', 'S40'),
      new MasterIndex([zapato]),
      'CODE128_EAN',
    );
    expect(rows[0].size).toBe('40');
    expect(rows[0].code128).toBe('76033980000040');
  });

  it('un modelo EXCLUIDO no se etiqueta, pero se REPORTA (no desaparece en silencio)', () => {
    MODELOS_EXCLUIDOS.add('MODELO_PRUEBA');
    try {
      const { rows, missing } = buildLabels(
        pedido('MODELO_PRUEBA', 'BLK', '03082800000C01', 'C01', 750),
        new MasterIndex([]),
        'CODE128_EAN',
      );
      expect(rows).toHaveLength(0);
      expect(missing).toEqual([
        { style: 'MODELO_PRUEBA', color: 'BLK', size: 'C01', qty: 750, reason: 'excluded_model' },
      ]);
    } finally {
      MODELOS_EXCLUIDOS.delete('MODELO_PRUEBA');
    }
  });

  it('BACKPACK ya NO está excluido: se etiqueta con la ref corta + cero delante', () => {
    // Silvia confirmó que los pedidos 4602991/4602992 sí se etiquetan (antes estuvo excluido).
    const mochila: MasterReference = {
      style: 'BACKPACK', color: 'BLK', ref: '308280', // 6 dígitos → 0308280
      size: 'U', tallaSap: 'C01', tallaTiendas: '35', ean13: '8433852613807', sku: '308280-U',
    };
    const { rows, missing } = buildLabels(
      pedido('BACKPACK', 'BLK', '03082800000C01', 'C01', 750),
      new MasterIndex([mochila]),
      'CODE128_EAN',
    );
    expect(missing).toHaveLength(0);
    expect(rows[0].code128).toBe('03082800000035'); // 308280 -> 0308280 + 00000 + 35
    expect(rows[0].size).toBe('U'); // lo que se imprime (cuando el maestro está bien)
  });
});

describe('Cuadre · un modelo excluido NO es un descuadre', () => {
  it('los pares excluidos EXPLICAN el pedido: cuadra igual', () => {
    // Antes salía "No cuadra: 0 de 750 (faltan 750)" en rojo, y mandaba a buscar unos códigos
    // que no hay que buscar. Excluir es una decisión de negocio, no un fallo.
    MODELOS_EXCLUIDOS.add('MODELO_PRUEBA');
    const order = pedido('MODELO_PRUEBA', 'BLK', '03082800000C01', 'C01', 750);
    const { rows, missing } = buildLabels(order, new MasterIndex([]), 'CODE128_EAN');
    MODELOS_EXCLUIDOS.delete('MODELO_PRUEBA');
    const r = reconcile(order, rows, missing);

    expect(r.orderPairs).toBe(750);
    expect(r.labelPairs).toBe(0);
    expect(r.excludedPairs).toBe(750);
    expect(r.balanced).toBe(true); // 0 etiquetados + 750 excluidos = 750 del pedido
    expect(r.diff).toBe(0);
  });

  it('pero un código que de verdad falta SÍ descuadra', () => {
    const order = pedido('ICONIC', 'BLK', '90087670000S31', 'S31', 40);
    const { rows, missing } = buildLabels(order, new MasterIndex([]), 'CODE128_EAN'); // maestro vacío
    const r = reconcile(order, rows, missing);

    expect(missing[0].reason).toBe('no_master_row');
    expect(r.excludedPairs).toBe(0);
    expect(r.balanced).toBe(false); // faltan 40 pares y nadie los explica
  });
});

describe('Trazabilidad de la conversión en la vista previa', () => {
  it('ropa: la fila lleva de dónde vino (PDF) y qué talla fue al código', () => {
    const { rows } = buildLabels(
      pedido('ICONIC', 'BLK', '90087670000S31', 'S31'),
      new MasterIndex([ropa]),
      'CODE128_EAN',
    );
    // Permite comprobar de un vistazo: 31 (PDF) → S (imprime) → 11 (código).
    expect(rows[0]).toMatchObject({ tallaSap: '31', size: 'S', tallaTiendas: '11' });
  });

  it('calzado: no se muestran (las tres tallas son la misma; serían ruido)', () => {
    const { rows } = buildLabels(
      pedido('NILO', 'RED', '76033980200S40', 'S40'),
      new MasterIndex([zapato]),
      'CODE128_EAN',
    );
    expect(rows[0].tallaSap).toBeUndefined();
    expect(rows[0].tallaTiendas).toBeUndefined();
  });
});
