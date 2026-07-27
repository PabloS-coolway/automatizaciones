-- REQ-008 Fase 1 · Log de actividad propio de RRHH (append-only). Independiente del log del panel (REQ-007).
CREATE TABLE "hr_activity" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "summary" TEXT NOT NULL,
    CONSTRAINT "hr_activity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hr_activity_created_at_idx" ON "hr_activity"("created_at");
