import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { HttpModule } from './http.module';
import {
  PDFTOTEXT_MISSING_MESSAGE,
  isPdftotextInstalled,
} from '../../infrastructure/pdf/pdf-text-extractor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(HttpModule);
  app.setGlobalPrefix('api');
  app.enableCors(); // el front (Vite) corre en otro puerto en desarrollo
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API etiquetas-coolway escuchando en http://localhost:${port}/api`);

  // Arranca igual (el maestro y los usuarios funcionan), pero generar etiquetas fallaría.
  if (!isPdftotextInstalled()) console.warn(`\n⚠  ${PDFTOTEXT_MISSING_MESSAGE}\n`);
}

void bootstrap();
