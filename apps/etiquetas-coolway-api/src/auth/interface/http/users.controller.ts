import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateUserRequest, ResetPasswordRequest, UpdateUserRequest, UserDto } from '@yorga/contracts';
import { PASSWORD_HASHER, PasswordHasher, USER_REPOSITORY, UserRepository } from '../../application/ports';
import { ROLE_REPOSITORY, RoleRepository } from '../../application/role.port';
import { toDto, JwtPayload } from '../../application/auth.service';
import { CurrentUser, RequireFeature } from './decorators';
import { User } from '../../domain/user';
import { PrismaService } from '../../../infrastructure/db/prisma.service';
import { ACTIVITY_RECORDER, ActivityRecorder } from '../../../actividad/application/activity-recorder.port';

/**
 * El log NUNCA guarda el hash de contraseña ni datos sensibles del usuario (REQ-007, regla no negociable):
 * el before/after se queda con lo visible. Una contraseña reseteada se ve por el `summary`, no por el diff.
 */
const sinHash = (u: User) => ({ id: u.id, email: u.email, name: u.name, role: u.role, active: u.active });

/** Administración de usuarios: alta, cambio de rol, activar/desactivar y reset de contraseña. */
@RequireFeature('usuarios.gestionar')
@Controller('users')
export class UsersController {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
    @Inject(ACTIVITY_RECORDER) private readonly actividad: ActivityRecorder,
    private readonly prisma: PrismaService,
  ) {}

  // El listado se ve tanto con «gestionar usuarios» como con «cambiar contraseña de usuarios» (para poder
  // elegir a quién resetear). Anula el @RequireFeature de clase (que exige sólo `usuarios.gestionar`).
  @Get()
  @RequireFeature('usuarios.gestionar', 'usuarios.password')
  async list(): Promise<UserDto[]> {
    // Se cargan los roles una vez y se mapean sus features, en vez de una consulta por usuario.
    const roles = await this.roles.findAll();
    const featuresByKey = new Map(roles.map((r) => [r.key, r.features]));
    return (await this.users.list()).map((u) => toDto(u, featuresByKey.get(u.role) ?? []));
  }

  @Post()
  async create(@Body() body: CreateUserRequest, @CurrentUser() me: JwtPayload): Promise<UserDto> {
    const email = body?.email?.trim().toLowerCase();
    if (!email || !body?.name || !body?.password) throw new BadRequestException('Indica email, nombre y contraseña.');
    if (body.password.length < 6) throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    if (await this.users.findByEmail(email)) throw new ConflictException('Ya existe un usuario con ese email.');

    const role = await this.roleOrFail(body.role);
    const passwordHash = await this.hasher.hash(body.password);
    const user = await this.prisma.$transaction(async (tx) => {
      const creado = await this.users.create({ email, name: body.name.trim(), passwordHash, role: role.key }, tx);
      await this.actividad.record(
        {
          actor: { userId: me.sub, email: me.email },
          action: 'CREATE',
          entity: 'USER',
          entityId: String(creado.id),
          after: sinHash(creado),
          summary: `Creó el usuario ${creado.email} (rol ${creado.role})`,
        },
        tx,
      );
      return creado;
    });
    return toDto(user, role.features);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserRequest,
    @CurrentUser() me: JwtPayload,
  ): Promise<UserDto> {
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException('Usuario no encontrado.');

    const data: { role?: string; active?: boolean } = {};

    if (body.role !== undefined && body.role !== target.role) {
      const nuevo = await this.roleOrFail(body.role);
      // Salvaguarda: no puedes cambiarte a ti mismo a un rol que no gestiona usuarios (te quedarías fuera).
      if (id === me.sub && !nuevo.features.includes('usuarios.gestionar')) {
        throw new ForbiddenException('No puedes quitarte a ti mismo el permiso de gestionar usuarios.');
      }
      data.role = nuevo.key;
    }

    if (typeof body.active === 'boolean') {
      if (id === me.sub && body.active === false) throw new ForbiddenException('No puedes desactivar tu propio usuario.');
      data.active = body.active;
    }

    if (Object.keys(data).length === 0) throw new BadRequestException('Nada que actualizar.');

    // Resumen legible de lo que cambió. (El reset de contraseña es un endpoint aparte, con su propia feature.)
    const cambios: string[] = [];
    if (data.role) cambios.push(`rol → ${data.role}`);
    if (data.active !== undefined) cambios.push(data.active ? 'activado' : 'desactivado');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await this.users.update(id, data, tx);
      await this.actividad.record(
        {
          actor: { userId: me.sub, email: me.email },
          action: 'UPDATE',
          entity: 'USER',
          entityId: String(id),
          before: sinHash(target),
          after: sinHash(u),
          summary: `Editó el usuario ${u.email}: ${cambios.join(', ')}`,
        },
        tx,
      );
      return u;
    });
    return toDto(updated, await this.roles.featuresOf(updated.role));
  }

  /**
   * Resetea la contraseña de OTRO usuario. Permiso propio (`usuarios.password`), separado de la gestión de
   * usuarios: así se puede dar "sólo reseteo" a un rol de soporte sin darle el alta/baja de usuarios.
   */
  @Post(':id/reset-password')
  @RequireFeature('usuarios.password')
  @HttpCode(204)
  async resetPassword(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ResetPasswordRequest,
    @CurrentUser() me: JwtPayload,
  ): Promise<void> {
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException('Usuario no encontrado.');
    if (!body?.password || body.password.length < 6) throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    const passwordHash = await this.hasher.hash(body.password);
    await this.prisma.$transaction(async (tx) => {
      await this.users.update(id, { passwordHash }, tx);
      await this.actividad.record(
        {
          actor: { userId: me.sub, email: me.email },
          action: 'UPDATE',
          entity: 'USER',
          entityId: String(id),
          summary: `Reseteó la contraseña de ${target.email}`, // el hash NUNCA se registra
        },
        tx,
      );
    });
  }

  /** El rol tiene que existir (la FK lo exigiría igual, pero así el error es 400 claro, no un 500). */
  private async roleOrFail(key: string | undefined) {
    const role = key ? await this.roles.findByKey(key) : null;
    if (!role) throw new BadRequestException(`Rol desconocido: "${key ?? ''}".`);
    return role;
  }
}
