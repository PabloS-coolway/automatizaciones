import { Module } from '@nestjs/common';
import { coreProviders } from './core.providers';
import { GenerateLabelsCommand } from './interface/cli/generate-labels.command';

/** Módulo de la CLI: proveedores comunes + el comando nest-commander. */
@Module({
  providers: [...coreProviders, GenerateLabelsCommand],
})
export class AppModule {}
