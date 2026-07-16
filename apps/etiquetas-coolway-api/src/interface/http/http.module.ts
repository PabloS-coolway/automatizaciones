import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { tmpdir } from 'node:os';
import { coreProviders } from '../../core.providers';
import { LabelsController } from './labels.controller';
import { MaestroController } from '../../maestro/interface/http/maestro.controller';
import { MaestroQuery } from '../../maestro/application/maestro-query.service';
import { MaestroExcelSerializer } from '../../maestro/infrastructure/maestro-excel-serializer';
import { AuthModule } from '../../auth/auth.module';
import { DestinationsController } from '../../destinos/interface/http/destinations.controller';

/** Módulo de la API HTTP: auth (guards globales) + proveedores comunes + subida de ficheros + controladores. */
@Module({
  imports: [AuthModule, MulterModule.register({ dest: tmpdir() })],
  controllers: [LabelsController, MaestroController, DestinationsController],
  providers: [...coreProviders, MaestroQuery, MaestroExcelSerializer],
})
export class HttpModule {}
