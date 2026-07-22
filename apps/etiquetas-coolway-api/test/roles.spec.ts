import { RolesService } from '../src/auth/application/roles.service';
import { RoleRecord, RoleRepository } from '../src/auth/application/role.port';
import {
  assertGestionAlcanzable,
  InvalidRoleError,
  normalizeRoleKey,
  validateFeatures,
  validateNewRole,
} from '../src/auth/domain/role';

describe('dominio de roles · validación', () => {
  it('normaliza el key ("Contable" y "contable" son el mismo)', () => {
    expect(normalizeRoleKey(' Contable ')).toBe('contable');
    expect(normalizeRoleKey('Jefe de Almacén')).toBe('jefe_de_almacén');
  });

  it('validateFeatures RECHAZA una feature inventada (no se protege nada)', () => {
    expect(() => validateFeatures(['etiquetas.ver', 'inventada.total'])).toThrow(/no se inventan|desconocida/i);
  });

  it('validateFeatures acepta y deduplica las del catálogo', () => {
    expect(validateFeatures(['maestro.ver', 'maestro.ver', 'etiquetas.ver'])).toEqual(['maestro.ver', 'etiquetas.ver']);
  });

  it('validateNewRole exige key y nombre, y acota el key', () => {
    expect(() => validateNewRole({ key: '', name: 'X', features: [] })).toThrow(/código del rol es obligatorio/);
    expect(() => validateNewRole({ key: 'X!', name: 'X', features: [] })).toThrow(/sólo puede llevar/);
    expect(() => validateNewRole({ key: 'x', name: '', features: [] })).toThrow(/nombre del rol es obligatorio/);
  });
});

describe('anti-bloqueo · siempre debe quedar quien gestione roles', () => {
  it('pasa si algún rol activo tiene roles.gestionar', () => {
    expect(() =>
      assertGestionAlcanzable([
        { active: true, features: ['roles.gestionar'] },
        { active: true, features: ['etiquetas.ver'] },
      ]),
    ).not.toThrow();
  });

  it('FALLA si ningún rol activo tiene roles.gestionar (nadie podría volver a administrar)', () => {
    expect(() =>
      assertGestionAlcanzable([
        { active: false, features: ['roles.gestionar'] }, // desactivado: no cuenta
        { active: true, features: ['etiquetas.ver'] },
      ]),
    ).toThrow(InvalidRoleError);
  });
});

/** Repo en memoria para el servicio. */
function repoCon(roles: RoleRecord[]): RoleRepository {
  return {
    findAll: jest.fn(async () => roles),
    findByKey: jest.fn(async (k) => roles.find((r) => r.key === k) ?? null),
    findById: jest.fn(async (id) => roles.find((r) => r.id === id) ?? null),
    featuresOf: jest.fn(async (k) => roles.find((r) => r.key === k)?.features ?? []),
    create: jest.fn(async (d) => ({ ...d, id: 99, active: true, system: false })),
    update: jest.fn(async (id, data) => ({ ...roles.find((r) => r.id === id)!, ...data })),
  };
}

const admin: RoleRecord = { id: 1, key: 'admin', name: 'Administrador', features: ['roles.gestionar', 'usuarios.gestionar'], active: true, system: true };
const operador: RoleRecord = { id: 2, key: 'operador', name: 'Operador', features: ['etiquetas.ver'], active: true, system: true };

describe('RolesService', () => {
  it('crea un rol nuevo', async () => {
    const s = new RolesService(repoCon([admin, operador]));
    await expect(s.create({ key: 'contable', name: 'Contable', features: ['maestro.ver'] })).resolves.toMatchObject({ key: 'contable' });
  });

  it('rechaza un key repetido', async () => {
    const s = new RolesService(repoCon([admin, operador]));
    await expect(s.create({ key: 'ADMIN', name: 'x', features: [] })).rejects.toThrow(/Ya existe un rol/);
  });

  it('DEJA quitar roles.gestionar de admin si otro rol activo la tiene', async () => {
    const otro: RoleRecord = { id: 3, key: 'jefe', name: 'Jefe', features: ['roles.gestionar'], active: true, system: false };
    const repo = repoCon([admin, operador, otro]);
    await expect(new RolesService(repo).update(1, { features: ['usuarios.gestionar'] })).resolves.toBeDefined();
  });

  it('BLOQUEA quitar roles.gestionar del ÚNICO rol que la tiene (te tapiarías fuera)', async () => {
    const s = new RolesService(repoCon([admin, operador]));
    await expect(s.update(1, { features: ['usuarios.gestionar'] })).rejects.toThrow(/gestionar roles|administrar/i);
  });

  it('BLOQUEA desactivar el único rol con roles.gestionar', async () => {
    const s = new RolesService(repoCon([admin, operador]));
    await expect(s.update(1, { active: false })).rejects.toThrow(InvalidRoleError);
  });

  it('rechaza una feature inventada al editar', async () => {
    const s = new RolesService(repoCon([admin, operador]));
    await expect(s.update(2, { features: ['pantallazo.total'] as never })).rejects.toThrow(/no se inventan|desconocida/i);
  });
});
