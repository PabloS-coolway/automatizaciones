import { bootstrapRrhh, BootstrapRrhhDeps } from '../src/rrhh/bootstrap-rrhh';

function fakeDeps(opts: { userId?: number | null; yaEmpleado?: boolean } = {}): BootstrapRrhhDeps & { created: unknown[] } {
  const created: unknown[] = [];
  return {
    created,
    findUserIdByEmail: async () => opts.userId ?? null,
    findEmployeeByUserId: async () => (opts.yaEmpleado ? { id: 1 } : null),
    createEmployee: async (e) => {
      created.push(e);
      return { id: 7 };
    },
  };
}

describe('bootstrapRrhh · primer empleado por variables de entorno', () => {
  it('sin RRHH_BOOTSTRAP_EMAIL no hace nada', async () => {
    const d = fakeDeps();
    const msg = await bootstrapRrhh(d, {});
    expect(msg).toMatch(/no se crea/);
    expect(d.created).toHaveLength(0);
  });

  it('si el usuario no existe, avisa y no crea nada', async () => {
    const d = fakeDeps({ userId: null });
    const msg = await bootstrapRrhh(d, { RRHH_BOOTSTRAP_EMAIL: 'pablo@coolway.com' });
    expect(msg).toMatch(/no hay ningún usuario/);
    expect(d.created).toHaveLength(0);
  });

  it('crea la ficha ADMIN enlazada al usuario existente (correo normalizado)', async () => {
    const d = fakeDeps({ userId: 42 });
    const msg = await bootstrapRrhh(d, { RRHH_BOOTSTRAP_EMAIL: 'Pablo@Coolway.com', RRHH_BOOTSTRAP_NAME: 'Pablo Silva' });
    expect(msg).toMatch(/creado/);
    expect(d.created).toEqual([{ userId: 42, fullName: 'Pablo Silva', rrhhRole: 'ADMIN' }]);
  });

  it('IDEMPOTENTE: si el usuario ya tiene ficha, no la duplica', async () => {
    const d = fakeDeps({ userId: 42, yaEmpleado: true });
    const msg = await bootstrapRrhh(d, { RRHH_BOOTSTRAP_EMAIL: 'pablo@coolway.com' });
    expect(msg).toMatch(/ya tiene ficha/);
    expect(d.created).toHaveLength(0);
  });

  it('sin RRHH_BOOTSTRAP_NAME usa el correo como nombre', async () => {
    const d = fakeDeps({ userId: 1 });
    await bootstrapRrhh(d, { RRHH_BOOTSTRAP_EMAIL: 'a@b.com' });
    expect((d.created[0] as { fullName: string }).fullName).toBe('a@b.com');
  });
});
