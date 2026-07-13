import { PurchaseOrder } from '../src/domain/model/order';
import { reconcile } from '../src/domain/services/reconciliation';
import { parseSapOrderText } from '../src/infrastructure/pdf/sap-order-parser';

/** Pedido de 2 cajas M36 (6 pares/caja) = 12 pares leídos. */
const pedido = (declared?: { boxes: number; pairs: number }): PurchaseOrder => ({
  orderNumber: '4603662',
  lines: [{ style: 'NILO', color: 'RED', refSap: '76033980500M36', assortment: 'M36', boxes: 2 }],
  declared,
});

const etiquetas = [{ style: 'NILO', color: 'RED', size: '36', qty: 12 } as never];

describe('Cuadre contra el total que declara el PDF', () => {
  it('detecta que el parser se ha dejado líneas (el PDF declara más pares de los leídos)', () => {
    const r = reconcile(pedido({ boxes: 100, pairs: 600 }), etiquetas);
    expect(r.orderPairs).toBe(12);
    expect(r.balanced).toBe(true); // cuadra CONSIGO MISMO: por eso no basta
    expect(r.matchesDeclared).toBe(false); // …pero el PDF dice que hay 600
    expect(r.missedPairs).toBe(588);
  });

  it('cuando lo leído coincide con lo declarado, matchesDeclared es true', () => {
    const r = reconcile(pedido({ boxes: 2, pairs: 12 }), etiquetas);
    expect(r.matchesDeclared).toBe(true);
    expect(r.missedPairs).toBe(0);
  });

  it('sin totales en el PDF no se acusa en falso', () => {
    const r = reconcile(pedido(undefined), etiquetas);
    expect(r.matchesDeclared).toBe(true);
    expect(r.declaredPairs).toBeUndefined();
  });
});

describe('Lectura del pie del PDF (TOTAL BOXES / TOTAL PAIRS)', () => {
  it('lee los totales con separador de millares', () => {
    const texto = [
      '        NILO       NILO ROJO M36 Surtido      RED      2     M36    6    35/42',
      '                              76033980500M36       total   2',
      '                    TOTAL BOXES     TOTAL PAIRS        AMOUNT       DISCOUNT',
      '                       1.838          11.028           11.028,00     110,28',
    ].join('\n');
    expect(parseSapOrderText(texto, '4603662').declared).toEqual({ boxes: 1838, pairs: 11028 });
  });
});
