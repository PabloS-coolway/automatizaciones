import { buildCode128 } from '../src/domain/services/code128';

describe('CODE128 (RN-02)', () => {
  it('compone ref + 00000 + talla (chica, dato real 4603187)', () => {
    expect(buildCode128('7623425', '36')).toBe('76234250000036');
  });

  it('compone ref + 00000 + talla (chico, dato real 4603187)', () => {
    expect(buildCode128('8623832', '40')).toBe('86238320000040');
  });
});
