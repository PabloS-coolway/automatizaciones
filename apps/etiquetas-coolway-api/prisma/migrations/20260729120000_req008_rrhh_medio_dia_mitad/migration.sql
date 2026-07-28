-- REQ-008 · Medio día en qué mitad (FIRST/SECOND), como en Factorial ("1st/2nd half of day").
-- Informativo para el equipo; a efectos de saldo un medio día sigue siendo 0,5.
ALTER TABLE "hr_absence" ADD COLUMN "half_day_part" TEXT;
