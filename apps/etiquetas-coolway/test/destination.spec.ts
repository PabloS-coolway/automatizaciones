import { MARKETS, resolveMarket } from '../src/domain/model/destination';

describe('Preset destino → variante + importado por (RF-14/RF-13)', () => {
  it('Valencia/tiendas → CODE128+EAN, importado por VANYOR', () => {
    expect(resolveMarket('VALENCIA')).toEqual({ variant: 'CODE128_EAN', importadoPor: 'VANYOR' });
  });

  it('USA → UPC+EAN, importado por COOLWAY USA', () => {
    expect(resolveMarket('USA')).toEqual({ variant: 'UPC_EAN', importadoPor: 'COOLWAY USA' });
  });

  it('Australia → solo UPC; Italia/UK/Costa Rica → solo EAN', () => {
    expect(MARKETS.AUSTRALIA.variant).toBe('UPC');
    expect(MARKETS.ITALIA.variant).toBe('EAN');
    expect(MARKETS.UK.variant).toBe('EAN');
    expect(MARKETS.COSTA_RICA.variant).toBe('EAN');
  });

  it('es insensible a mayúsculas y lanza si el mercado no existe', () => {
    expect(resolveMarket('usa').importadoPor).toBe('COOLWAY USA');
    expect(() => resolveMarket('MARTE')).toThrow(/desconocido/);
  });
});
