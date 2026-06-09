import { genderFromRef } from '../src/domain/services/gender';

describe('Género por prefijo de referencia (RN-04)', () => {
  it('76… → chica (W), incluida ref SAP completa', () => {
    expect(genderFromRef('76033980200S36')).toBe('W');
    expect(genderFromRef('7693164')).toBe('W');
  });

  it('86… → chico (M)', () => {
    expect(genderFromRef('8623832')).toBe('M');
    expect(genderFromRef('86039550800S46')).toBe('M');
  });
});
