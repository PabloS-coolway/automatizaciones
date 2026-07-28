-- REQ-008 Fase 3 · Justificante de ausencia (referencia al objeto en el almacenamiento).
ALTER TABLE "hr_absence" ADD COLUMN "attachment_key" TEXT;
ALTER TABLE "hr_absence" ADD COLUMN "attachment_name" TEXT;
