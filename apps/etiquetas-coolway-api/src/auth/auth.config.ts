import { JwtModuleOptions } from '@nestjs/jwt';

/**
 * Configuración del JWT. En local usa un secreto por defecto; en despliegue
 * es OBLIGATORIO definir JWT_SECRET en el entorno (ver README de despliegue).
 */
export function jwtOptions(): JwtModuleOptions {
  const secret = process.env.JWT_SECRET ?? 'dev-only-coolway-secret-cambiar-en-produccion';
  return {
    secret,
    // expiresIn admite formato de `ms` (p.ej. '12h', '7d'); el tipo es estricto, de ahí el cast.
    signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? '12h') as `${number}h` },
  };
}
