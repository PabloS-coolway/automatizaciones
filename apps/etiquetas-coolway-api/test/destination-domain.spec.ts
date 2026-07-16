import { LABEL_VARIANTS } from '@yorga/contracts';
import {
  InvalidDestinationError,
  normalizeCode,
  validateNewDestination,
  validateVariant,
} from '../src/destinos/domain/destination';

const valido = { code: 'JAPON', name: 'Japón', variant: 'EAN', importadoPor: 'Cliente JP' };

describe('validateVariant · la variante NO es texto libre', () => {
  it('acepta las 7 combinaciones de códigos que el motor sabe construir', () => {
    for (const v of LABEL_VARIANTS) expect(validateVariant(v)).toBe(v);
  });

  it('RECHAZA cualquier otra cosa (si no, se guardaría un destino que no sabe imprimir)', () => {
    // La pantalla compone el nombre a partir de los checkboxes, pero la API es pública: nada impide
    // mandar "UPC+EAN13" a mano, y el generador no sabría qué hacer con eso.
    expect(() => validateVariant('UPC+EAN13')).toThrow(InvalidDestinationError);
    expect(() => validateVariant('EAN_CODE128')).toThrow(/no existe/); // el orden canónico manda
    expect(() => validateVariant('')).toThrow(/no existe/);
    expect(() => validateVariant(undefined)).toThrow(/Válidas: CODE128, UPC, EAN/);
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
