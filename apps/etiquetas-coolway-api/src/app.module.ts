import { Module } from '@nestjs/common';
import { coreProviders } from './core.providers';
import { GenerateLabelsCommand } from './interface/cli/generate-labels.command';
import { ImportMasterCommand } from './maestro/interface/import-master.command';
import { SeedMasterCommand } from './maestro/interface/seed-master.command';
import { PASSWORD_HASHER, USER_REPOSITORY } from './auth/application/ports';
import { BcryptHasher } from './auth/infrastructure/bcrypt-hasher';
import { PrismaUserRepository } from './auth/infrastructure/prisma-user.repository';
import { CreateUserCommand } from './auth/interface/cli/create-user.command';

/** Módulo de la CLI: proveedores comunes + comandos nest-commander. */
@Module({
  providers: [
    ...coreProviders,
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
    { provide: PASSWORD_HASHER, useClass: BcryptHasher },
    GenerateLabelsCommand,
    ImportMasterCommand,
    SeedMasterCommand,
    CreateUserCommand,
  ],
})
export class AppModule {}
