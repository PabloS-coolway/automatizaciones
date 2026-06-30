import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { HttpModule } from './http.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(HttpModule);
  app.setGlobalPrefix('api');
  app.enableCors(); // el front (Vite) corre en otro puerto en desarrollo
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API etiquetas-coolway escuchando en http://localhost:${port}/api`);
}

void bootstrap();
