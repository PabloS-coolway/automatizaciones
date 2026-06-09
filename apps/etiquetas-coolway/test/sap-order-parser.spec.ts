import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSapOrderText } from '../src/infrastructure/pdf/sap-order-parser';

const layout = readFileSync(join(__dirname, 'fixtures', '4603418.layout.txt'), 'utf8');

describe('parseSapOrderText — PDF 4603418 (pares sueltos)', () => {
  const order = parseSapOrderText(layout);

  it('detecta el número de pedido', () => {
    expect(order.orderNumber).toBe('4603418');
  });

  it('extrae 7 líneas (S36..S42) de NILO BRW', () => {
    expect(order.lines).toHaveLength(7);
    expect(order.lines.every((l) => l.style === 'NILO' && l.color === 'BRW')).toBe(true);
  });

  it('cada línea trae surtido, ref SAP y cajas correctos', () => {
    expect(order.lines[0]).toEqual({
      style: 'NILO',
      color: 'BRW',
      refSap: '76033980200S36',
      assortment: 'S36',
      boxes: 4,
    });
    expect(order.lines.map((l) => l.boxes)).toEqual([4, 8, 14, 16, 10, 5, 3]);
    expect(order.lines.map((l) => l.assortment)).toEqual(['S36', 'S37', 'S38', 'S39', 'S40', 'S41', 'S42']);
  });
});
