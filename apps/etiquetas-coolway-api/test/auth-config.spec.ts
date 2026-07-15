import { DEV_SECRET, resolveJwtSecret } from '../src/auth/auth.config';

describe('resolveJwtSecret · JWT_SECRET obligatorio en producción', () => {
  it('fuera de producción, sin JWT_SECRET → usa el secreto de desarrollo', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'development' })).toBe(DEV_SECRET);
    expect(resolveJwtSecret({})).toBe(DEV_SECRET);
  });

  it('EN PRODUCCIÓN sin JWT_SECRET → LANZA (no se arranca con la puerta abierta)', () => {
    // Con el secreto de dev desplegado, cualquiera se firmaría un token de admin.
    expect(() => resolveJwtSecret({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET no está definido/);
  });

  it('en producción con JWT_SECRET definido → lo usa', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'production', JWT_SECRET: 'un-secreto-de-verdad' })).toBe(
      'un-secreto-de-verdad',
    );
  });

  it('el secreto propio siempre gana al de desarrollo', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'development', JWT_SECRET: 'mío' })).toBe('mío');
  });
});
