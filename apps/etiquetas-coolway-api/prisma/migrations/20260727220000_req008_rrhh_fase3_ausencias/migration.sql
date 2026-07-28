-- REQ-008 Fase 3 · Ausencias y vacaciones (tipos + solicitudes).
CREATE TABLE "hr_absence_type" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "computes_balance" BOOLEAN NOT NULL DEFAULT false,
    "requires_approval" BOOLEAN NOT NULL DEFAULT true,
    "requires_attachment" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "hr_absence_type_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hr_absence_type_name_key" ON "hr_absence_type"("name");

CREATE TABLE "hr_absence" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "type_id" INTEGER NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "half_day" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "decided_by_email" TEXT,
    "decided_at" TIMESTAMP(3),
    "decision_note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_absence_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hr_absence_employee_id_start_date_idx" ON "hr_absence"("employee_id", "start_date");

ALTER TABLE "hr_absence" ADD CONSTRAINT "hr_absence_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hr_absence" ADD CONSTRAINT "hr_absence_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "hr_absence_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
