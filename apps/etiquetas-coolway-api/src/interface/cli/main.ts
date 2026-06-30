import 'reflect-metadata';
import 'dotenv/config';
import { CommandFactory } from 'nest-commander';
import { AppModule } from '../../app.module';

async function bootstrap(): Promise<void> {
  await CommandFactory.run(AppModule, ['warn', 'error']);
}

void bootstrap();
