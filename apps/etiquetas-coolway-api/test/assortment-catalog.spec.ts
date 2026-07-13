import {
  ASSORTMENTS,
  UnknownAssortmentError,
  assortmentTotalPairs,
  expandAssortment,
} from '../src/domain/services/assortment-catalog';

describe('Catálogo de surtidos', () => {
  it('surtido I suma 12 pares y cubre 36-41', () => {
    expect(assortmentTotalPairs('I')).toBe(12);
    expect(Object.keys(expandAssortment('I').pairs)).toEqual(['36', '37', '38', '39', '40', '41']);
  });

  it('surtido KR suma 8 pares', () => {
    expect(assortmentTotalPairs('KR')).toBe(8);
  });

  it('RN-03: surtido DEI cubre 37-42 (no 36-41) y suma 12', () => {
    expect(Object.keys(expandAssortment('DEI').pairs)).toEqual(['37', '38', '39', '40', '41', '42']);
    expect(assortmentTotalPairs('DEI')).toBe(12);
  });

  it('surtidos de chico Z/P/GRZ tienen género M', () => {
    expect(ASSORTMENTS['Z'].gender).toBe('M');
    expect(ASSORTMENTS['P'].gender).toBe('M');
    expect(ASSORTMENTS['GRZ'].gender).toBe('M');
  });

  it('pares sueltos S<nn> → 1 par en esa talla', () => {
    expect(expandAssortment('S36').pairs).toEqual({ '36': 1 });
    expect(assortmentTotalPairs('S42')).toBe(1);
  });

  it('S46 es surtido conocido de chico (un par en 46)', () => {
    expect(expandAssortment('S46')).toEqual({ gender: 'M', pairs: { '46': 1 } });
  });

  it('caja monotalla M<nn> → 6 pares, todos de esa talla (pedido 4603662)', () => {
    expect(expandAssortment('M36').pairs).toEqual({ '36': 6 });
    expect(assortmentTotalPairs('M36')).toBe(6);
    expect(assortmentTotalPairs('M46')).toBe(6); // también en tallas de chico
  });

  it('surtido desconocido lanza UnknownAssortmentError con el código (no inventa)', () => {
    expect(() => expandAssortment('XX')).toThrow(UnknownAssortmentError);
    try {
      expandAssortment('XX');
    } catch (e) {
      expect((e as UnknownAssortmentError).code).toBe('XX');
    }
  });
});
