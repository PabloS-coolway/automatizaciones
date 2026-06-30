-- This is an empty migration.-- CHECK de formato (red de seguridad; la app además valida y reporta)
ALTER TABLE "reference" ADD CONSTRAINT "ean13_format" CHECK ("ean13" IS NULL OR "ean13" ~ '^[0-9]{13}$');
ALTER TABLE "reference" ADD CONSTRAINT "upc_format"   CHECK ("upc"   IS NULL OR "upc"   ~ '^[0-9]{12}$');
