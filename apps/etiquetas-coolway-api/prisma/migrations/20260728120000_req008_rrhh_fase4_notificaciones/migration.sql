-- REQ-008 Fase 4 · Avisos in-app.
CREATE TABLE "hr_notification" (
    "id" SERIAL NOT NULL,
    "employee_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "hr_notification_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "hr_notification_employee_id_read_at_idx" ON "hr_notification"("employee_id", "read_at");
ALTER TABLE "hr_notification" ADD CONSTRAINT "hr_notification_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "hr_employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
