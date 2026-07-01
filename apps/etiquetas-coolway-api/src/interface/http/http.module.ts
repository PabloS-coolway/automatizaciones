import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { tmpdir } from 'node:os';
import { coreProviders } from '../../core.providers';
import { LabelsController } from './labels.controller';
import { MaestroController } from '../../maestro/interface/http/maestro.controller';
import { MaestroQuery } from '../../maestro/application/maestro-query.service';
import { AuthModule } from '../../auth/auth.module';

/** Módulo de la API HTTP: auth (guards globales) + proveedores comunes + subida de ficheros + controladores. */
@Module({
  imports: [AuthModule, MulterModule.register({ dest: tmpdir() })],
  controllers: [LabelsController, MaestroController],
  providers: [...coreProviders, MaestroQuery],
})
export class HttpModule {}
