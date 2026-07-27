-- REQ-008 · Fase 0 (cimientos RRHH): centros, departamentos y empleados. Dominio independiente; el enlace con
-- el login es `hr_employee.user_id` → `app_user.id` (1:1). Aditivo: no toca tablas existentes salvo la FK.

CREATE TABLE "hr_center" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    CONSTRAINT "hr_center_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "hr_department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    CONSTRAINT "hr_department_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hr_department_name_key" ON "hr_department"("name");

CREATE TABLE "hr_employee" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "full_name" TEXT NOT NULL,
    "position" TEXT,
    "rrhh_role" TEXT NOT NULL DEFAULT 'EMPLEADO',
    "manager_id" INTEGER,
    "department_id" INTEGER,
    "center_id" INTEGER,
    "contract_type" TEXT,
    "iban" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "hired_at" TIMESTAMP(3),
    "terminated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "hr_employee_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "hr_employee_user_id_key" ON "hr_employee"("user_id");
CREATE INDEX "hr_employee_manager_id_idx" ON "hr_employee"("manager_id");

ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "hr_employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "hr_department"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "hr_center"("id") ON DELETE SET NULL ON UPDATE CASCADE;
