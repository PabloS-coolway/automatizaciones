import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Feature } from '@yorga/contracts';
import { FeatureGuard } from '../src/auth/interface/http/feature.guard';
import { RoleRepository } from '../src/auth/application/role.port';

/** ExecutionContext mínimo: sólo lo que el guard mira (handler/class para el reflector, y request.user). */
function ctxWith(user: unknown): ExecutionContext {
  return {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guardWith(required: Feature[] | undefined, featuresByRole: Record<string, Feature[]>): FeatureGuard {
  const reflector = { getAllAndOverride: () => required } as unknown as Reflector;
  const roles: RoleRepository = {
    findByKey: async () => null,
    findById: async () => null,
    findAll: async () => [],
    featuresOf: async (key: string) => featuresByRole[key] ?? [],
    create: async (d) => ({ ...d, id: 1, active: true, system: false }),
    update: async () => ({ id: 1, key: '', name: '', features: [], active: true, system: false }),
  };
  return new FeatureGuard(reflector, roles);
}

describe('FeatureGuard · REQ-006 (enforcement por feature)', () => {
  it('sin @RequireFeature deja pasar: basta con estar autenticado', async () => {
    const g = guardWith(undefined, {});
    await expect(g.canActivate(ctxWith({ role: 'operador' }))).resolves.toBe(true);
  });

  it('deja pasar si el rol del usuario TIENE la feature', async () => {
    const g = guardWith(['usuarios.gestionar'], { admin: ['usuarios.gestionar'] });
    await expect(g.canActivate(ctxWith({ role: 'admin' }))).resolves.toBe(true);
  });

  it('BLOQUEA si el rol NO tiene la feature (el fallo que sería un agujero: dejar pasar de más)', async () => {
    const g = guardWith(['usuarios.gestionar'], { operador: ['etiquetas.ver', 'maestro.ver'] });
    await expect(g.canActivate(ctxWith({ role: 'operador' }))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('las features se leen POR ROL desde el repo: un rol nuevo con la feature entra, sin tocar el JWT', async () => {
    // Es lo que hace que un cambio de permisos aplique sin re-login: el guard NO mira el token, mira la BD.
    const g = guardWith(['destinos.gestionar'], { contable: ['destinos.gestionar'] });
    await expect(g.canActivate(ctxWith({ role: 'contable' }))).resolves.toBe(true);
  });

  it('basta con tener UNA de las features declaradas', async () => {
    const g = guardWith(['maestro.cargar', 'roles.gestionar'], { admin: ['roles.gestionar'] });
    await expect(g.canActivate(ctxWith({ role: 'admin' }))).resolves.toBe(true);
  });

  it('sin usuario en la petición, bloquea', async () => {
    const g = guardWith(['usuarios.gestionar'], {});
    await expect(g.canActivate(ctxWith(undefined))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
