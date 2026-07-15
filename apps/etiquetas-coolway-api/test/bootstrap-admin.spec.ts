import { bootstrapAdmin, BootstrapAdminDeps } from '../src/auth/bootstrap-admin';

function fakeDeps(existe = false): BootstrapAdminDeps & { created: unknown[] } {
  const created: unknown[] = [];
  return {
    created,
    findByEmail: async () => (existe ? { id: 1 } : null),
    create: async (u) => {
      created.push(u);
      return { id: 9, email: u.email };
    },
    hash: async (p) => `hash(${p})`,
  };
}

describe('bootstrapAdmin · primer admin por variables de entorno', () => {
  it('sin ADMIN_EMAIL/ADMIN_PASSWORD no hace nada', async () => {
    const d = fakeDeps();
    const msg = await bootstrapAdmin(d, {});
    expect(msg).toMatch(/no se crea/);
    expect(d.created).toHaveLength(0);
  });

  it('crea el admin cuando no existe, con la contraseña HASHEADA (nunca en claro)', async () => {
    const d = fakeDeps(false);
    const msg = await bootstrapAdmin(d, {
      ADMIN_EMAIL: 'Pablo@Coolway.com',
      ADMIN_PASSWORD: 'secreta',
      ADMIN_NAME: 'Pablo',
    });

    expect(msg).toMatch(/creado/);
    expect(d.created).toEqual([
      { email: 'pablo@coolway.com', name: 'Pablo', passwordHash: 'hash(secreta)', role: 'admin' },
    ]);
  });

  it('IDEMPOTENTE: si el admin ya existe, no lo duplica', async () => {
    const d = fakeDeps(true);
    const msg = await bootstrapAdmin(d, { ADMIN_EMAIL: 'pablo@coolway.com', ADMIN_PASSWORD: 'x' });

    expect(msg).toMatch(/ya existe/);
    expect(d.created).toHaveLength(0);
  });

  it('sin ADMIN_NAME usa "Admin" por defecto', async () => {
    const d = fakeDeps(false);
    await bootstrapAdmin(d, { ADMIN_EMAIL: 'a@b.com', ADMIN_PASSWORD: 'x' });
    expect((d.created[0] as { name: string }).name).toBe('Admin');
  });
});
