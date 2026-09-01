ALTER TABLE "Estudiante" ADD COLUMN "jornada" TEXT NOT NULL DEFAULT 'Sin registrar';

ALTER TABLE "Salida" ADD COLUMN "recogeNombre" TEXT;
ALTER TABLE "Salida" ADD COLUMN "recogeApellido" TEXT;
ALTER TABLE "Salida" ADD COLUMN "recogeCedula" TEXT;
ALTER TABLE "Salida" ADD COLUMN "recogeParentesco" TEXT;
ALTER TABLE "Salida" ADD COLUMN "recogeCorreo" TEXT;

CREATE TABLE "EstudianteAcudiente" (
  "estudianteId" INTEGER NOT NULL,
  "acudienteId" INTEGER NOT NULL,
  "esPrincipal" BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY ("estudianteId", "acudienteId"),
  CONSTRAINT "EstudianteAcudiente_estudianteId_fkey" FOREIGN KEY ("estudianteId") REFERENCES "Estudiante" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "EstudianteAcudiente_acudienteId_fkey" FOREIGN KEY ("acudienteId") REFERENCES "Acudiente" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT OR IGNORE INTO "EstudianteAcudiente" ("estudianteId", "acudienteId", "esPrincipal") SELECT "id", "acudienteId", true FROM "Estudiante";
