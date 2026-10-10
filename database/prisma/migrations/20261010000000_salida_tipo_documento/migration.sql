ALTER TABLE "Salida" ADD COLUMN "recogeTipoDocumento" TEXT;

UPDATE "Salida"
SET "recogeTipoDocumento" = 'CC'
WHERE "recogeTipoDocumento" IS NULL AND "recogeCedula" IS NOT NULL;
