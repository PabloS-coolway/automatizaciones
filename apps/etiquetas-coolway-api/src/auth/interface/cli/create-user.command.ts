import { Inject } from '@nestjs/common';
import { Command, CommandRunner, Option } from 'nest-commander';
import { Role } from '@yorga/contracts';
import { PASSWORD_HASHER, PasswordHasher, USER_REPOSITORY, UserRepository } from '../../application/ports';

interface Opts {
  email?: string;
  password?: string;
  name?: string;
  role?: Role;
}

/** Crea un usuario. Sirve para dar de alta el primer admin (no hay registro abierto). */
@Command({ name: 'auth:create-user', description: 'Crea un usuario (email, contraseña, nombre, rol).' })
export class CreateUserCommand extends CommandRunner {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {
    super();
  }

  async run(_args: string[], opts: Opts): Promise<void> {
    const email = opts.email?.trim().toLowerCase();
    if (!email || !opts.password || !opts.name) {
      console.error('Uso: auth:create-user --email a@b.com --password "clave" --name "Nombre" [--role admin|operador]');
      process.exitCode = 1;
      return;
    }
    const role: Role = opts.role === 'admin' ? 'admin' : 'operador';

    if (await this.users.findByEmail(email)) {
      console.error(`Ya existe un usuario con email ${email}.`);
      process.exitCode = 1;
      return;
    }

    const passwordHash = await this.hasher.hash(opts.password);
    const user = await this.users.create({ email, name: opts.name, passwordHash, role });
    console.log(`Usuario creado: #${user.id} ${user.email} · ${user.role}`);
  }

  @Option({ flags: '-e, --email <email>', description: 'Email (identificador de acceso)' })
  parseEmail(v: string): string {
    return v;
  }

  @Option({ flags: '-p, --password <password>', description: 'Contraseña en claro (se guarda hasheada)' })
  parsePassword(v: string): string {
    return v;
  }

  @Option({ flags: '-n, --name <name>', description: 'Nombre para mostrar' })
  parseName(v: string): string {
    return v;
  }

  @Option({ flags: '-r, --role <role>', description: 'admin | operador (por defecto operador)' })
  parseRole(v: string): Role {
    return v === 'admin' ? 'admin' : 'operador';
  }
}
