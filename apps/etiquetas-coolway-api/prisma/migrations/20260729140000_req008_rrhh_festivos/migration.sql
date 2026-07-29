-- REQ-008 · Festivos por centro (o globales). Informativo: no descuenta saldo (vacaciones = días naturales).
CREATE TABLE "hr_holiday" (
  "id"         SERIAL NOT NULL,
  "date"       DATE NOT NULL,
  "name"       TEXT NOT NULL,
  "center_id"  INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hr_holiday_pkey" PRIMARY KEY ("id")
);

-- Un festivo por (fecha, centro). Con center_id NULL (global) Postgres trata los NULL como distintos,
-- así que la unicidad del festivo global se refuerza además en el servicio.
CREATE UNIQUE INDEX "hr_holiday_date_center_id_key" ON "hr_holiday"("date", "center_id");
CREATE INDEX "hr_holiday_date_idx" ON "hr_holiday"("date");

ALTER TABLE "hr_holiday" ADD CONSTRAINT "hr_holiday_center_id_fkey"
  FOREIGN KEY ("center_id") REFERENCES "hr_center"("id") ON DELETE CASCADE ON UPDATE CASCADE;
