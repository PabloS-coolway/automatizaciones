-- REQ-008 Fase 2 · Geolocalización opcional del fichaje (solo coordenadas, con consentimiento).
ALTER TABLE "hr_time_entry" ADD COLUMN "latitude" DOUBLE PRECISION;
ALTER TABLE "hr_time_entry" ADD COLUMN "longitude" DOUBLE PRECISION;
ALTER TABLE "hr_time_entry" ADD COLUMN "accuracy" DOUBLE PRECISION;
