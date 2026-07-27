-- REQ-008 Fase 2 (Slice 2b) · Corrección de fichajes con traza (append-only).
ALTER TABLE "hr_time_entry" ADD COLUMN "actor_email" TEXT;
ALTER TABLE "hr_time_entry" ADD COLUMN "corrects_id" INTEGER;
