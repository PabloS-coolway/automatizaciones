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

describe('parseSapOrderText — colores compuestos y cajas monotalla (PDF 4603662)', () => {
  // Reproduce el fallo real: el color W-B (blanco-negro) lleva guión. El parser lo ignoraba
  // y se comía el ítem ENTERO en silencio: 37 refs, 133 cajas, 798 pares sin etiquetar.
  const texto = [
    '        BLAKE                      BLAKE BLANCO-NEGRO M36              W-B               1     M36       6      35/42',
    ' 167                               Surtido',
    '                                                76035480701M36                total      1',
    '        NILO                       NILO ROJO M38 Surtido               RED               6     M38       6      35/42',
    '                                                76033980500M38                total      6',
  ].join('\n');

  const order = parseSapOrderText(texto, '4603662');

  it('NO se salta el ítem cuyo color lleva guión (W-B)', () => {
    expect(order.lines).toHaveLength(2);
    expect(order.lines[0]).toEqual({
      style: 'BLAKE',
      color: 'W-B',
      refSap: '76035480701M36',
      assortment: 'M36',
      boxes: 1,
    });
  });

  it('sigue leyendo los colores normales (RED)', () => {
    expect(order.lines[1].color).toBe('RED');
    expect(order.lines[1].assortment).toBe('M38');
    expect(order.lines[1].boxes).toBe(6);
  });
});
