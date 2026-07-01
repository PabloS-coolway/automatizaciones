import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { CreateUserRequest, UpdateUserRequest, UserDto } from '@yorga/contracts';
import { PASSWORD_HASHER, PasswordHasher, USER_REPOSITORY, UserRepository } from '../../application/ports';
import { toDto, JwtPayload } from '../../application/auth.service';
import { CurrentUser, Roles } from './decorators';

/** Administración de usuarios: alta, cambio de rol, activar/desactivar y reset de contraseña. Sólo admin. */
@Roles('admin')
@Controller('users')
export class UsersController {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_HASHER) private readonly hasher: PasswordHasher,
  ) {}

  @Get()
  async list(): Promise<UserDto[]> {
    return (await this.users.list()).map(toDto);
  }

  @Post()
  async create(@Body() body: CreateUserRequest): Promise<UserDto> {
    const email = body?.email?.trim().toLowerCase();
    if (!email || !body?.name || !body?.password) throw new BadRequestException('Indica email, nombre y contraseña.');
    if (body.password.length < 6) throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
    if (await this.users.findByEmail(email)) throw new ConflictException('Ya existe un usuario con ese email.');

    const role = body.role === 'admin' ? 'admin' : 'operador';
    const passwordHash = await this.hasher.hash(body.password);
    const user = await this.users.create({ email, name: body.name.trim(), passwordHash, role });
    return toDto(user);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateUserRequest,
    @CurrentUser() me: JwtPayload,
  ): Promise<UserDto> {
    const target = await this.users.findById(id);
    if (!target) throw new NotFoundException('Usuario no encontrado.');

    // Salvaguardas: un admin no puede dejarse a sí mismo sin acceso.
    if (id === me.sub && body.active === false) throw new ForbiddenException('No puedes desactivar tu propio usuario.');
    if (id === me.sub && body.role === 'operador') throw new ForbiddenException('No puedes quitarte a ti mismo el rol admin.');

    const data: { role?: 'operador' | 'admin'; active?: boolean; passwordHash?: string } = {};
    if (body.role) data.role = body.role === 'admin' ? 'admin' : 'operador';
    if (typeof body.active === 'boolean') data.active = body.active;
    if (body.password) {
      if (body.password.length < 6) throw new BadRequestException('La contraseña debe tener al menos 6 caracteres.');
      data.passwordHash = await this.hasher.hash(body.password);
    }
    if (Object.keys(data).length === 0) throw new BadRequestException('Nada que actualizar.');

    return toDto(await this.users.update(id, data));
  }
}
