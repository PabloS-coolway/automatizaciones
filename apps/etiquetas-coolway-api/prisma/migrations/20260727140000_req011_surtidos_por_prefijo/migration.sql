-- REQ-011 · Surtidos por PREFIJO de referencia (76/86), sustituye el modelo por-referencia de REQ-010 Fase 2.
-- La tabla `surtido` (ref→SURTD) estaba vacía en prod → se puede reemplazar sin pérdida de datos.

DROP TABLE IF EXISTS "surtido";

CREATE TABLE "poda_surtido" (
    "id" SERIAL NOT NULL,
    "grupo" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "poda_surtido_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "poda_surtido_grupo_codigo_key" ON "poda_surtido"("grupo", "codigo");

-- Seed con las listas que pasó Silvia (27/07). Chica = prefijo 76, chico = prefijo 86.
INSERT INTO "poda_surtido" ("grupo", "codigo") VALUES
  ('76','00I'),('76','0KR'),('76','00D'),('76','00E'),('76','00L'),('76','00M'),('76','00N'),('76','DE4'),
  ('76','S36'),('76','S37'),('76','S38'),('76','S39'),('76','S40'),('76','S41'),('76','S42'),
  ('76','M36'),('76','M37'),('76','M38'),('76','M39'),('76','M40'),('76','M41'),('76','M42'),
  ('86','00Z'),('86','00P'),('86','00Y'),('86','00R'),('86','00S'),('86','00T'),
  ('86','S40'),('86','S41'),('86','S42'),('86','S43'),('86','S44'),('86','S45'),('86','S46'),
  ('86','M40'),('86','M41'),('86','M42'),('86','M43'),('86','M44'),('86','M45'),('86','M46');
