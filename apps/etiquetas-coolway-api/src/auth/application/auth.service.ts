import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginResponse, UserDto } from '@yorga/contracts';
import { User } from '../domain/user';
import { PASSWORD_HASHER, PasswordHasher, USER_REPOSITORY, UserRepository } from './ports';

/** Contenido del JWT que viaja en cada petición. */
export interface JwtPayload {
  sub: number;
  email: string;
  name: string;
  role: User['role'];
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    private readonly jwt: JwtService,
  ) {}

  /** Valida credenciales y emite un token. Mensaje genérico: no revela si el email existe. */
  async login(email: string, password: string): Promise<LoginResponse> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    const ok = user && user.active && (await this.hasher.compare(password, user.passwordHash));
    if (!user || !ok) throw new UnauthorizedException('Email o contraseña incorrectos.');

    const payload: JwtPayload = { sub: user.id, email: user.email, name: user.name, role: user.role };
    const token = await this.jwt.signAsync(payload);
    return { token, user: toDto(user) };
  }

  /** Devuelve el usuario del payload (para GET /auth/me), verificando que siga activo. */
  async me(userId: number): Promise<UserDto> {
    const user = await this.users.findById(userId);
    if (!user || !user.active) throw new UnauthorizedException('Sesión no válida.');
    return toDto(user);
  }
}

export function toDto(u: User): UserDto {
  return { id: u.id, email: u.email, name: u.name, role: u.role };
}
