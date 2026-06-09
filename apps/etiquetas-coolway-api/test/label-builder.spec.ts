import { MasterReference } from '../src/domain/model/reference';
import { PurchaseOrder } from '../src/domain/model/order';
import { buildLabels } from '../src/domain/services/label-builder';
import { MasterIndex } from '../src/domain/services/master-index';
import { reconcile } from '../src/domain/services/reconciliation';

/** Maestro NILO BRW chica (ref 7643398), datos reales de la salida validada etiquetas_4603418. */
const NILO_BRW: MasterReference[] = [
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '36', ean13: '8433852642814', upc: '843385236998', sku: '7643398-36' },
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '37', ean13: '8433852642821', upc: '843385237001', sku: '7643398-37' },
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '38', ean13: '8433852642838', upc: '843385237018', sku: '7643398-38' },
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '39', ean13: '8433852642845', upc: '843385237025', sku: '7643398-39' },
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '40', ean13: '8433852642852', upc: '843385237032', sku: '7643398-40' },
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '41', ean13: '8433852642869', upc: '843385237049', sku: '7643398-41' },
  { style: 'NILO', color: 'BRW', ref: '7643398', size: '42', ean13: '8433852648021', upc: '843385237056', sku: '7643398-42' },
];

/** Pedido 4603418: pares sueltos S36..S42 con cajas 4,8,14,16,10,5,3 (ref SAP 76 → chica). */
const ORDER_4603418: PurchaseOrder = {
  orderNumber: '4603418',
  lines: [
    { style: 'NILO', color: 'BRW', refSap: '76033980200S36', assortment: 'S36', boxes: 4 },
    { style: 'NILO', color: 'BRW', refSap: '76033980200S37', assortment: 'S37', boxes: 8 },
    { style: 'NILO', color: 'BRW', refSap: '76033980200S38', assortment: 'S38', boxes: 14 },
    { style: 'NILO', color: 'BRW', refSap: '76033980200S39', assortment: 'S39', boxes: 16 },
    { style: 'NILO', color: 'BRW', refSap: '76033980200S40', assortment: 'S40', boxes: 10 },
    { style: 'NILO', color: 'BRW', refSap: '76033980200S41', assortment: 'S41', boxes: 5 },
    { style: 'NILO', color: 'BRW', refSap: '76033980200S42', assortment: 'S42', boxes: 3 },
  ],
};

describe('buildLabels — mini-GT-1 (reproduce salida validada 4603418, variante UPC+EAN)', () => {
  const { rows, missing } = buildLabels(ORDER_4603418, new MasterIndex(NILO_BRW), 'UPC_EAN');

  it('genera 7 filas, una por talla, sin faltantes', () => {
    expect(missing).toHaveLength(0);
    expect(rows).toHaveLength(7);
  });

  it('QTY por talla = cajas (pares sueltos): 4,8,14,16,10,5,3', () => {
    expect(rows.map((r) => r.qty)).toEqual([4, 8, 14, 16, 10, 5, 3]);
  });

  it('cuadra en 60 pares contra el pedido', () => {
    expect(reconcile(ORDER_4603418, rows)).toMatchObject({ orderPairs: 60, labelPairs: 60, balanced: true });
  });

  it('lee EAN13/UPC del maestro y compone SKU correctamente (talla 36)', () => {
    expect(rows[0]).toMatchObject({
      style: 'NILO', color: 'BRW', ref: '7643398', size: '36',
      sku: '7643398-36', qty: 4, ean13: '8433852642814', upc: '843385236998',
    });
  });

  it('no incluye code128 en variante UPC+EAN', () => {
    expect(rows[0].code128).toBeUndefined();
  });
});

describe('buildLabels — reglas RN-06', () => {
  it('suma QTY de la misma (ref, talla) que viene en dos surtidos', () => {
    const order: PurchaseOrder = {
      orderNumber: 'X',
      lines: [
        { style: 'NILO', color: 'BRW', refSap: '76033980200S36', assortment: 'S36', boxes: 2 },
        { style: 'NILO', color: 'BRW', refSap: '76033980200S36', assortment: 'S36', boxes: 3 },
      ],
    };
    const { rows } = buildLabels(order, new MasterIndex(NILO_BRW), 'EAN');
    expect(rows).toHaveLength(1);
    expect(rows[0].qty).toBe(5);
  });

  it('NUNCA fusiona entre géneros: talla 40 chica y chico → dos filas distintas', () => {
    const master = new MasterIndex([
      { style: 'NILO', color: 'BRW', ref: '7643398', size: '40', ean13: 'E76', upc: 'U40', sku: '7643398-40' },
      { style: 'NILO', color: 'BRW', ref: '8643808', size: '40', ean13: 'E86', upc: 'U40', sku: '8643808-40' },
    ]);
    const order: PurchaseOrder = {
      orderNumber: 'X',
      lines: [
        { style: 'NILO', color: 'BRW', refSap: '76033980200S40', assortment: 'S40', boxes: 1 },
        { style: 'NILO', color: 'BRW', refSap: '86039550800S40', assortment: 'S40', boxes: 1 },
      ],
    };
    const { rows } = buildLabels(order, master, 'EAN');
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.ref)).toEqual(['7643398', '8643808']); // 76 antes que 86
  });
});

describe('MasterIndex — RN-05 (UPC compartido entre géneros)', () => {
  it('si falta el UPC en la ref chica, toma el de la ref chico (misma talla)', () => {
    const master = new MasterIndex([
      { style: 'NILO', color: 'BRW', ref: '7643398', size: '41', ean13: 'E76', sku: '7643398-41' }, // sin upc
      { style: 'NILO', color: 'BRW', ref: '8643808', size: '41', ean13: 'E86', upc: '843385237049', sku: '8643808-41' },
    ]);
    expect(master.resolveUpc('NILO', 'BRW', '41', 'W')).toBe('843385237049');
  });
});

describe('buildLabels — columna importado por (RF-13)', () => {
  it('estampa el valor importadoPor en todas las filas', () => {
    const { rows } = buildLabels(ORDER_4603418, new MasterIndex(NILO_BRW), 'UPC_EAN', 'VANYOR');
    expect(rows.every((r) => r.importadoPor === 'VANYOR')).toBe(true);
  });
});
