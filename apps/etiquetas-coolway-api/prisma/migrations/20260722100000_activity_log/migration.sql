-- REQ-007 · Log de actividad (auditoría). Tabla append-only: sólo la API escribe, nadie edita/borra.
CREATE TABLE "activity_entry" (
    "id" SERIAL NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_user_id" INTEGER,
    "actor_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "summary" TEXT NOT NULL,
    CONSTRAINT "activity_entry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "activity_entry_created_at_idx" ON "activity_entry"("created_at");
CREATE INDEX "activity_entry_entity_entity_id_idx" ON "activity_entry"("entity", "entity_id");

-- La feature nueva `actividad.ver` se concede a los roles que ya gestionan roles (los admins), para que
-- exista quien pueda ver el log desde el primer momento. El catálogo es cerrado; esto sólo la ASIGNA.
UPDATE "role" SET "features" = array_append("features", 'actividad.ver')
WHERE 'roles.gestionar' = ANY("features") AND NOT ('actividad.ver' = ANY("features"));
