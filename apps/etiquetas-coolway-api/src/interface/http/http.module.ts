import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { tmpdir } from 'node:os';
import { coreProviders } from '../../core.providers';
import { LabelsController } from './labels.controller';
import { MaestroController } from '../../maestro/interface/http/maestro.controller';
import { MaestroQuery } from '../../maestro/application/maestro-query.service';

/** Módulo de la API HTTP: proveedores comunes + subida de ficheros + controladores (etiquetas + maestro). */
@Module({
  imports: [MulterModule.register({ dest: tmpdir() })],
  controllers: [LabelsController, MaestroController],
  providers: [...coreProviders, MaestroQuery],
})
export class HttpModule {}
