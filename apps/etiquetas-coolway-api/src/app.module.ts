import { Module } from '@nestjs/common';
import { coreProviders } from './core.providers';
import { GenerateLabelsCommand } from './interface/cli/generate-labels.command';
import { ImportMasterCommand } from './maestro/interface/import-master.command';

/** Módulo de la CLI: proveedores comunes + comandos nest-commander. */
@Module({
  providers: [...coreProviders, GenerateLabelsCommand, ImportMasterCommand],
})
export class AppModule {}
