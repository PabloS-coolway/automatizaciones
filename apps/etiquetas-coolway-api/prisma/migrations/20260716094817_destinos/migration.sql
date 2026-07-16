-- CreateTable
CREATE TABLE "destination" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "importado_por" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destination_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "destination_code_key" ON "destination"("code");

-- Siembra: los 6 destinos que hasta ahora vivían en el código (packages/contracts/src/markets.ts).
-- Se insertan aquí para que, al desplegar, NADA cambie: los mismos destinos, las mismas variantes y
-- los mismos "importado por" que ya usaba Silvia (RF-13/RF-14, confirmados por ella en REQ-001).
INSERT INTO "destination" ("code", "name", "variant", "importado_por", "active", "created_at", "updated_at") VALUES
  ('VALENCIA',   'Valencia / tiendas', 'CODE128_EAN', 'VANYOR S.A.U',     true, NOW(), NOW()),
  ('USA',        'USA',                'UPC_EAN',     'COOLWAY USA LLC',  true, NOW(), NOW()),
  ('AUSTRALIA',  'Australia',          'UPC',         'Australia',        true, NOW(), NOW()),
  ('ITALIA',     'Italia',             'EAN',         'Italia',           true, NOW(), NOW()),
  ('UK',         'UK',                 'EAN',         'UK',               true, NOW(), NOW()),
  ('COSTA_RICA', 'Costa Rica',         'EAN',         'Costa Rica',       true, NOW(), NOW());
