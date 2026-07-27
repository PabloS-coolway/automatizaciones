-- REQ-008 Fase 2 (Slice 1) · Fichajes de jornada (registro solo-añadir).
CREATE TABLE "hr_time_entry" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" TEXT NOT NULL DEFAULT 'WEB',
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_time_entry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "hr_time_entry_employee_id_at_idx" ON "hr_time_entry"("employee_id", "at");

ALTER TABLE "hr_time_entry" ADD CONSTRAINT "hr_time_entry_employee_id_fkey"
  FOREIGN KEY ("employee_id") REFERENCES "hr_employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
