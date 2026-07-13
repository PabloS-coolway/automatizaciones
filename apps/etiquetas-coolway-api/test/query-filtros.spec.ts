import * as qs from 'qs';
import { MAX_VALORES_FILTRO, asValores } from '../src/maestro/interface/http/maestro.controller';

describe('asValores · cómo llegan los filtros de casillas por la query', () => {
  it('un array es un array', () => {
    expect(asValores(['GOAL', 'BECKS'])).toEqual(['GOAL', 'BECKS']);
  });

  it('un solo valor también', () => {
    expect(asValores('GOAL')).toEqual(['GOAL']);
  });

  it('ausente = sin filtro; vacío = "ningún valor" (0 filas)', () => {
    expect(asValores(undefined)).toBeUndefined();
    expect(asValores('')).toEqual([]);
  });

  it('EL BUG: qs devuelve un OBJETO cuando el array pasa de `arrayLimit` → hay que aceptarlo', () => {
    // Con más de 20 valores repetidos, `qs` deja de construir un array y devuelve {0:…, 1:…}.
    // Antes se convertía en la cadena "[object Object]", no coincidía con ningún color y la tabla
    // salía VACÍA sin ningún error. Con `color web` (408 valores distintos) pasaba siempre.
    expect(asValores({ 0: 'BLACK LEATHER', 1: 'GREY CORAL' })).toEqual(['BLACK LEATHER', 'GREY CORAL']);
  });
});

describe('El parseo de la query aguanta un filtro con muchos valores', () => {
  const query = (n: number) =>
    Array.from({ length: n }, (_, i) => `colorNameWeb=COLOR${i}`).join('&');

  it('con el `arrayLimit` por defecto de qs (20), 21 valores se convierten en objeto (la causa del bug)', () => {
    const parsed = qs.parse(query(21)) as Record<string, unknown>;
    expect(Array.isArray(parsed.colorNameWeb)).toBe(false); // ← esto es lo que rompía
    // …pero `asValores` ya lo entiende igualmente.
    expect(asValores(parsed.colorNameWeb)).toHaveLength(21);
  });

  it('con el límite que configura la API, 408 valores siguen siendo un array', () => {
    const parsed = qs.parse(query(408), { arrayLimit: MAX_VALORES_FILTRO }) as Record<string, unknown>;
    expect(Array.isArray(parsed.colorNameWeb)).toBe(true);
    expect(asValores(parsed.colorNameWeb)).toHaveLength(408);
  });
});
