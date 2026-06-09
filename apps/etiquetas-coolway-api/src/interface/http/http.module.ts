import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { tmpdir } from 'node:os';
import { coreProviders } from '../../core.providers';
import { LabelsController } from './labels.controller';

/** Módulo de la API HTTP: proveedores comunes + subida de ficheros a temporal + controlador. */
@Module({
  imports: [MulterModule.register({ dest: tmpdir() })],
  controllers: [LabelsController],
  providers: [...coreProviders],
})
export class HttpModule {}
