-- Registro de procesos de convivencia basado en el manual institucional.
CREATE TABLE IF NOT EXISTS "ConvivenciaReporte" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "estudianteId" TEXT NOT NULL,
  "estudiante" TEXT NOT NULL,
  "grado" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "etapa" TEXT NOT NULL,
  "competencia" TEXT NOT NULL,
  "notificacionAcudiente" TEXT NOT NULL,
  "requiereSiuce" BOOLEAN NOT NULL DEFAULT false,
  "creadoPorId" INTEGER NOT NULL,
  "creadoPorNombre" TEXT NOT NULL,
  "creadoPorRol" TEXT NOT NULL,
  "evidencia" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'abierto',
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ConvivenciaReporte_estudianteId_idx"
  ON "ConvivenciaReporte" ("estudianteId");

CREATE INDEX IF NOT EXISTS "ConvivenciaReporte_estado_creadoEn_idx"
  ON "ConvivenciaReporte" ("estado", "creadoEn");
