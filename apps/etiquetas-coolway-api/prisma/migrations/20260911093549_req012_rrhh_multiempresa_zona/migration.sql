-- AlterTable
ALTER TABLE "hr_center" ADD COLUMN     "code" TEXT,
ADD COLUMN     "zone_id" INTEGER;

-- AlterTable
ALTER TABLE "hr_employee" ADD COLUMN     "categoria_id" INTEGER,
ADD COLUMN     "company_id" INTEGER,
ADD COLUMN     "contract_type_id" INTEGER,
ADD COLUMN     "dni" TEXT,
ADD COLUMN     "employee_code" TEXT,
ADD COLUMN     "fecha_antiguedad" DATE,
ADD COLUMN     "seccion_id" INTEGER;

-- CreateTable
CREATE TABLE "hr_company" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hr_company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_zone" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "convenio_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_convenio" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_convenio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_convenio_permiso" (
    "id" SERIAL NOT NULL,
    "convenio_id" INTEGER NOT NULL,
    "absence_type_id" INTEGER NOT NULL,
    "dias_max" INTEGER,
    "remunerado" BOOLEAN,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hr_convenio_permiso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_categoria" (
    "id" SERIAL NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,

    CONSTRAINT "hr_categoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_contract_type" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "hr_contract_type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hr_seccion" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,

    CONSTRAINT "hr_seccion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "hr_company_code_key" ON "hr_company"("code");

-- CreateIndex
CREATE UNIQUE INDEX "hr_zone_name_key" ON "hr_zone"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hr_convenio_name_key" ON "hr_convenio"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hr_convenio_permiso_convenio_id_absence_type_id_key" ON "hr_convenio_permiso"("convenio_id", "absence_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "hr_categoria_name_key" ON "hr_categoria"("name");

-- CreateIndex
CREATE UNIQUE INDEX "hr_contract_type_code_key" ON "hr_contract_type"("code");

-- CreateIndex
CREATE UNIQUE INDEX "hr_seccion_code_key" ON "hr_seccion"("code");

-- CreateIndex
CREATE UNIQUE INDEX "hr_employee_company_id_employee_code_key" ON "hr_employee"("company_id", "employee_code");

-- AddForeignKey
ALTER TABLE "hr_center" ADD CONSTRAINT "hr_center_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "hr_zone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_zone" ADD CONSTRAINT "hr_zone_convenio_id_fkey" FOREIGN KEY ("convenio_id") REFERENCES "hr_convenio"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_convenio_permiso" ADD CONSTRAINT "hr_convenio_permiso_convenio_id_fkey" FOREIGN KEY ("convenio_id") REFERENCES "hr_convenio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_convenio_permiso" ADD CONSTRAINT "hr_convenio_permiso_absence_type_id_fkey" FOREIGN KEY ("absence_type_id") REFERENCES "hr_absence_type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "hr_company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "hr_categoria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_contract_type_id_fkey" FOREIGN KEY ("contract_type_id") REFERENCES "hr_contract_type"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hr_employee" ADD CONSTRAINT "hr_employee_seccion_id_fkey" FOREIGN KEY ("seccion_id") REFERENCES "hr_seccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

