-- REQ-006 · Roles y permisos por feature, autoadministrables.
-- Escrita a MANO: la migración auto de Prisma dropea la columna `role` (pérdida de datos). Ésta convierte
-- el enum a texto conservando el dato, siembra los roles de sistema con las features del estado ACTUAL, y
-- ata la FK. Nadie debe notar el cambio: operador/admin quedan con exactamente lo que podían hoy.

-- 1. Tabla de roles (rol como dato gobernable).
CREATE TABLE "role" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "features" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "role_key_key" ON "role"("key");

-- 2. Siembra de los roles de SISTEMA con las features que reproducen el estado de hoy:
--    admin = todas; operador = generar etiquetas + consultar el maestro (lo que ya podía).
INSERT INTO "role" ("key", "name", "features", "active", "system", "updated_at") VALUES
  ('admin', 'Administrador',
     ARRAY['etiquetas.ver','maestro.ver','maestro.cargar','destinos.gestionar','usuarios.gestionar','roles.gestionar'],
     true, true, CURRENT_TIMESTAMP),
  ('operador', 'Operador',
     ARRAY['etiquetas.ver','maestro.ver'],
     true, true, CURRENT_TIMESTAMP);

-- 3. Convertir app_user.role de enum a TEXTO sin perder el dato ('operador'/'admin' se conservan tal cual).
ALTER TABLE "app_user" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "app_user" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;
ALTER TABLE "app_user" ALTER COLUMN "role" SET DEFAULT 'operador';

-- 4. Quitar el tipo enum, que ya no se usa.
DROP TYPE "Role";

-- 5. Integridad referencial: un usuario no puede tener un rol que no existe.
ALTER TABLE "app_user" ADD CONSTRAINT "app_user_role_fkey"
  FOREIGN KEY ("role") REFERENCES "role"("key") ON UPDATE CASCADE ON DELETE RESTRICT;
