-- REQ-008 · Privacidad de cumpleaños: el empleado puede ocultar su cumpleaños del equipo
-- sin borrar la fecha (RRHH la sigue necesitando).
ALTER TABLE "hr_employee" ADD COLUMN "hide_birthday" BOOLEAN NOT NULL DEFAULT false;
