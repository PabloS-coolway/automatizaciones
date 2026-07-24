-- REQ-010 · Fase 2 — Catálogo de surtidos (ref → código SURTD). Dato gestionado por Silvia desde la web.
CREATE TABLE "surtido" (
    "id" SERIAL NOT NULL,
    "ref" TEXT NOT NULL,
    "surtido" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "surtido_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "surtido_ref_key" ON "surtido"("ref");
