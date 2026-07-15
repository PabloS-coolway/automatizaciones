import 'reflect-metadata';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as qs from 'qs';
import { HttpModule } from './http.module';
import { MAX_VALORES_FILTRO } from '../../maestro/interface/http/maestro.controller';
import {
  PDFTOTEXT_MISSING_MESSAGE,
  isPdftotextInstalled,
} from '../../infrastructure/pdf/pdf-text-extractor';
import { bootstrapAdmin } from '../../auth/bootstrap-admin';
import {
  PASSWORD_HASHER,
  PasswordHasher,
  USER_REPOSITORY,
  UserRepository,
} from '../../auth/application/ports';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(HttpModule);
  app.setGlobalPrefix('api');
  app.enableCors(); // el front (Vite) corre en otro puerto en desarrollo

  /**
   * ⚠️ Express parsea la query con `qs`, que por defecto tiene `arrayLimit: 20`: a partir de 21
   * valores repetidos DEJA de construir un array y devuelve un objeto `{0:…, 1:…}`.
   *
   * Eso hacía que un filtro con muchos valores (p.ej. `color web`, con 408 distintos) se leyera mal
   * y la tabla saliera VACÍA, sin ningún error. Un filtro del maestro puede llevar cientos de valores:
   * se sube el límite para que un array siga siendo un array.
   */
  app.set('query parser', (str: string) => qs.parse(str, { arrayLimit: MAX_VALORES_FILTRO }));
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`API etiquetas-coolway escuchando en http://localhost:${port}/api`);

  // Arranca igual (el maestro y los usuarios funcionan), pero generar etiquetas fallaría.
  if (!isPdftotextInstalled()) console.warn(`\n⚠  ${PDFTOTEXT_MISSING_MESSAGE}\n`);

  // Primer admin por variables de entorno (para el despliegue, donde no hay CLI a mano). Idempotente.
  try {
    const users = app.get<UserRepository>(USER_REPOSITORY, { strict: false });
    const hasher = app.get<PasswordHasher>(PASSWORD_HASHER, { strict: false });
    const msg = await bootstrapAdmin({
      findByEmail: (e) => users.findByEmail(e),
      create: (u) => users.create(u),
      hash: (p) => hasher.hash(p),
    });
    console.log(`[bootstrap] ${msg}`);
  } catch (e) {
    console.warn(`[bootstrap] no se pudo comprobar el admin de arranque: ${(e as Error).message}`);
  }
}

void bootstrap();
