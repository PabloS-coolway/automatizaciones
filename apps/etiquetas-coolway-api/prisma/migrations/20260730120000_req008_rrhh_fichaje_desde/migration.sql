-- REQ-008 · Desde qué día se le exige fichar a un empleado. Antes de esta fecha no se marca "falta fichar".
ALTER TABLE "hr_employee" ADD COLUMN "fichaje_desde" DATE;
