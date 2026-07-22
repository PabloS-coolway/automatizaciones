-- REQ-009 · Editar el "color web" del maestro inline, respetando la edición ante reimport.
-- Cambios ADITIVOS y nullable/con default: no rompen lecturas ni escrituras existentes.
--   · color_name_web_manual  → marca que el color web se editó a mano (el seed no lo pisa).
--   · color_name_web_edited_by / _at → rastro de quién y cuándo (además del log de actividad, REQ-007).
ALTER TABLE "reference" ADD COLUMN "color_name_web_manual" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "reference" ADD COLUMN "color_name_web_edited_by" TEXT;
ALTER TABLE "reference" ADD COLUMN "color_name_web_edited_at" TIMESTAMP(3);
