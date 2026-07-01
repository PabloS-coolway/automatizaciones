import { Module, Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../infrastructure/db/prisma.service';
import { AuthService } from './application/auth.service';
import { PASSWORD_HASHER, USER_REPOSITORY } from './application/ports';
import { BcryptHasher } from './infrastructure/bcrypt-hasher';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './interface/http/auth.controller';
import { UsersController } from './interface/http/users.controller';
import { JwtAuthGuard } from './interface/http/jwt-auth.guard';
import { RolesGuard } from './interface/http/roles.guard';
import { jwtOptions } from './auth.config';

/** Proveedores del hexágono de auth (compartibles por HTTP y CLI). */
export const authProviders: Provider[] = [
  PrismaService,
  AuthService,
  { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  { provide: PASSWORD_HASHER, useClass: BcryptHasher },
];

/** Módulo de autenticación: login/me + guards globales (JWT + roles). */
@Module({
  imports: [JwtModule.register(jwtOptions())],
  controllers: [AuthController, UsersController],
  providers: [
    ...authProviders,
    { provide: APP_GUARD, useClass: JwtAuthGuard }, // 1º: exige token
    { provide: APP_GUARD, useClass: RolesGuard }, // 2º: comprueba rol
  ],
  exports: [AuthService, USER_REPOSITORY, PASSWORD_HASHER, JwtModule],
})
export class AuthModule {}
