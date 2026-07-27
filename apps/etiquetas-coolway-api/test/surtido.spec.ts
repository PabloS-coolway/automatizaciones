import { SurtidoInvalidoError, validateSurtido } from '../src/surtidos/domain/surtido';

describe('validateSurtido · REQ-010 Fase 2', () => {
  it('normaliza la ref (sólo dígitos) y el surtido a MAYÚSCULAS (el SURTD de SAP lo es)', () => {
    expect(validateSurtido({ ref: '"7613553', surtido: '0g2' })).toEqual({ ref: '7613553', surtido: '0G2' });
  });

  it('la ref debe tener 7 dígitos (no se inventa una asignación con ref rara)', () => {
    expect(() => validateSurtido({ ref: '761355', surtido: '0G2' })).toThrow(SurtidoInvalidoError);
    expect(() => validateSurtido({ ref: '76135530', surtido: '0G2' })).toThrow(/7 dígitos/);
  });

  it('el código de surtido no puede quedar vacío', () => {
    expect(() => validateSurtido({ ref: '7613553', surtido: '   ' })).toThrow(SurtidoInvalidoError);
  });
});
