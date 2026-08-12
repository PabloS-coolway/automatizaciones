import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../src/auth/application/auth.service';
import { PasswordHasher, UserRepository } from '../src/auth/application/ports';
import { RoleRepository } from '../src/auth/application/role.port';
import { User } from '../src/auth/domain/user';

/** Hasher de mentira: el "hash" es `H(plain)`; comparar = el hash coincide. Determinista, sin bcrypt. */
const hasher: PasswordHasher = {
  hash: async (p) => `H(${p})`,
  compare: async (p, h) => h === `H(${p})`,
};

function usersRepo(user: User): UserRepository & { guardado?: string } {
  const estado: { guardado?: string } = {};
  return {
    findByEmail: async () => user,
    findById: async (id) => (id === user.id ? user : null),
    create: async () => user,
    update: async (_id, data) => {
      if (data.passwordHash) estado.guardado = data.passwordHash;
      return user;
    },
    list: async () => [user],
    count: async () => 1,
    get guardado() {
      return estado.guardado;
    },
  } as UserRepository & { guardado?: string };
}

const rolesStub = {} as RoleRepository;
const jwtStub = {} as never;

function svcCon(user: Partial<User> = {}) {
  const base: User = { id: 1, email: 'ana@y.com', name: 'Ana', passwordHash: 'H(actual123)', role: 'operador', active: true, ...user };
  const repo = usersRepo(base);
  return { svc: new AuthService(repo, hasher, rolesStub, jwtStub), repo };
}

describe('AuthService · cambiar contraseña propia', () => {
  it('cambia la contraseña si la actual es correcta y la nueva es válida', async () => {
    const { svc, repo } = svcCon();
    await svc.changePassword(1, 'actual123', 'nuevaSegura9');
    expect(repo.guardado).toBe('H(nuevaSegura9)'); // se guardó el hash de la NUEVA
  });

  it('rechaza si la contraseña ACTUAL no es correcta', async () => {
    const { svc } = svcCon();
    await expect(svc.changePassword(1, 'incorrecta', 'nuevaSegura9')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza una nueva demasiado corta', async () => {
    const { svc } = svcCon();
    await expect(svc.changePassword(1, 'actual123', '123')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si la nueva es igual que la actual', async () => {
    const { svc } = svcCon();
    await expect(svc.changePassword(1, 'actual123', 'actual123')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rechaza si el usuario no existe o está inactivo', async () => {
    const { svc } = svcCon({ active: false });
    await expect(svc.changePassword(1, 'actual123', 'nuevaSegura9')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
