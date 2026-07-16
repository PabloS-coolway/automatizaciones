import {
  InvalidDestinationError,
  normalizeCode,
  validateNewDestination,
  validateVariant,
} from '../src/destinos/domain/destination';

const valido = { code: 'JAPON', name: 'Japón', variant: 'EAN', importadoPor: 'Cliente JP' };

describe('validateVariant · la variante NO es texto libre', () => {
  it('acepta las cuatro que el motor sabe construir', () => {
    expect(validateVariant('EAN')).toBe('EAN');
    expect(validateVariant('UPC')).toBe('UPC');
    expect(validateVariant('CODE128_EAN')).toBe('CODE128_EAN');
    expect(validateVariant('UPC_EAN')).toBe('UPC_EAN');
  });

  it('RECHAZA cualquier otra cosa (si no, se guardaría un destino que no sabe imprimir)', () => {
    // Silvia podría escribir "UPC+EAN13" pensando que vale: el generador no sabría qué hacer.
    expect(() => validateVariant('UPC+EAN13')).toThrow(InvalidDestinationError);
    expect(() => validateVariant('')).toThrow(/no existe/);
    expect(() => validateVariant(undefined)).toThrow(/Válidas: EAN, UPC, CODE128_EAN, UPC_EAN/);
  });
});

describe('normalizeCode · "usa" y "USA" son el mismo destino', () => {
  it('pasa a mayúsculas y quita espacios', () => {
    expect(normalizeCode(' usa ')).toBe('USA');
    expect(normalizeCode('costa rica')).toBe('COSTA_RICA');
  });
});

describe('validateNewDestination', () => {
  it('normaliza y devuelve el destino', () => {
    expect(validateNewDestination({ ...valido, code: ' japon ' })).toEqual({
      code: 'JAPON',
      name: 'Japón',
      variant: 'EAN',
      importadoPor: 'Cliente JP',
    });
  });

  it('exige código', () => {
    expect(() => validateNewDestination({ ...valido, code: '  ' })).toThrow(/código del destino es obligatorio/);
  });

  it('rechaza códigos con caracteres raros', () => {
    expect(() => validateNewDestination({ ...valido, code: 'JAPÓN!' })).toThrow(/sólo puede llevar letras/);
  });

  it('exige nombre (es lo que se ve en el desplegable)', () => {
    expect(() => validateNewDestination({ ...valido, name: '' })).toThrow(/nombre es obligatorio/);
  });

  it('exige "importado por" (es lo que se IMPRIME en la etiqueta)', () => {
    expect(() => validateNewDestination({ ...valido, importadoPor: '' })).toThrow(/importado por.*obligatorio/);
  });

  it('rechaza una variante inventada', () => {
    expect(() => validateNewDestination({ ...valido, variant: 'LO_QUE_SEA' })).toThrow(/no existe/);
  });
});
