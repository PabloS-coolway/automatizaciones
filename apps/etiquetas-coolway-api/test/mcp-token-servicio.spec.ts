import { comprobarAcceso, parsearTokens, tokenDeCabecera, tokenValido } from '../src/mcp/application/token-servicio';

describe('MCP · token de servicio (MCP_TOKENS)', () => {
  it('parsea la lista separada por comas, sin huecos ni vacíos', () => {
    expect(parsearTokens(' a , b,, ')).toEqual(['a', 'b']);
    expect(parsearTokens(undefined)).toEqual([]);
    expect(parsearTokens('')).toEqual([]);
  });

  it('sólo acepta "Bearer <token>"', () => {
    expect(tokenDeCabecera('Bearer abc')).toBe('abc');
    expect(tokenDeCabecera('bearer   abc ')).toBe('abc');
    expect(tokenDeCabecera('Basic abc')).toBe('');
    expect(tokenDeCabecera(undefined)).toBe('');
    expect(tokenDeCabecera(['Bearer x', 'Bearer y'])).toBe('x');
  });

  it('valida contra cualquiera de los configurados; vacío o prefijo NO valen', () => {
    expect(tokenValido('b', ['a', 'b'])).toBe(true);
    expect(tokenValido('', ['a', 'b'])).toBe(false);
    expect(tokenValido('b-mas', ['a', 'b'])).toBe(false);
    expect(tokenValido('a', [])).toBe(false);
  });

  it('SIN tokens configurados → 503 (nunca queda abierto), aunque se mande cabecera', () => {
    const r = comprobarAcceso('Bearer lo-que-sea', undefined);
    expect(r).toEqual(expect.objectContaining({ ok: false, status: 503 }));
    expect(comprobarAcceso('Bearer x', ' , ')).toEqual(expect.objectContaining({ ok: false, status: 503 }));
  });

  it('sin token o con token malo → 401; con uno bueno → ok', () => {
    expect(comprobarAcceso(undefined, 't1,t2')).toEqual(expect.objectContaining({ ok: false, status: 401 }));
    expect(comprobarAcceso('Bearer malo', 't1,t2')).toEqual(expect.objectContaining({ ok: false, status: 401 }));
    expect(comprobarAcceso('Bearer t2', 't1,t2')).toEqual({ ok: true });
  });
});
