import { UsersController } from '../src/auth/interface/http/users.controller';

const me = { sub: 1, email: 'admin@coolway.co', name: 'Admin', role: 'admin' } as never;
const TARGET = { id: 10, email: 'ana@coolway.co', name: 'Ana', passwordHash: 'HASH_VIEJO', role: 'operador', active: true };

function build() {
  const recorder = { record: jest.fn() };
  const userRepo = {
    findByEmail: jest.fn(async () => null),
    findById: jest.fn(async () => TARGET),
    create: jest.fn(async (input: { email: string; name: string; passwordHash: string; role: string }) => ({ ...input, id: 10, active: true })),
    update: jest.fn(async (_id: number, data: object) => ({ ...TARGET, ...data })),
    list: jest.fn(async () => []),
    count: jest.fn(async () => 1),
  };
  const roleRepo = {
    findByKey: jest.fn(async (key: string) => ({ id: 2, key, name: key, features: key === 'admin' ? ['usuarios.gestionar'] : [], active: true, system: true })),
    findById: jest.fn(),
    findAll: jest.fn(async () => []),
    featuresOf: jest.fn(async () => []),
    create: jest.fn(),
    update: jest.fn(),
  };
  const hasher = { hash: jest.fn(async () => 'HASH_NUEVO'), compare: jest.fn(async () => true) };
  const prismaFake = { $transaction: async (fn: (tx: unknown) => unknown) => fn({}) };
  const c = new UsersController(userRepo as never, roleRepo as never, hasher as never, recorder as never, prismaFake as never);
  return { c, recorder };
}

describe('REQ-007 · el log de usuarios NUNCA guarda el hash de contraseña', () => {
  it('al crear un usuario, el `after` registrado no lleva passwordHash', async () => {
    const { c, recorder } = build();
    await c.create({ email: 'nuevo@coolway.co', name: 'Nuevo', password: '123456', role: 'operador' }, me);

    const [entry] = recorder.record.mock.calls[0];
    expect(entry).toMatchObject({ action: 'CREATE', entity: 'USER' });
    expect(JSON.stringify(entry.after)).not.toContain('HASH'); // ← el hash no aparece
    expect(entry.after).not.toHaveProperty('passwordHash');
  });

  it('al resetear la contraseña, ni el before ni el after llevan el hash (y el resumen lo dice)', async () => {
    const { c, recorder } = build();
    await c.update(10, { password: '654321' }, me);

    const [entry] = recorder.record.mock.calls[0];
    expect(entry).toMatchObject({ action: 'UPDATE', entity: 'USER' });
    expect(entry.before).not.toHaveProperty('passwordHash');
    expect(entry.after).not.toHaveProperty('passwordHash');
    expect(JSON.stringify(entry)).not.toContain('HASH');
    expect(entry.summary).toMatch(/contraseña reseteada/);
  });

  it('un cambio de rol se registra con antes→después (sin hash)', async () => {
    const { c, recorder } = build();
    await c.update(10, { role: 'admin' }, me);
    const [entry] = recorder.record.mock.calls[0];
    expect(entry.before).toMatchObject({ role: 'operador' });
    expect(entry.after).toMatchObject({ role: 'admin' });
    expect(entry.summary).toMatch(/rol → admin/);
  });
});
