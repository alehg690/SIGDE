-- Completa la trazabilidad de los reportes disciplinarios sin eliminar datos existentes.
ALTER TABLE "Reporte" ADD COLUMN "fechaHecho" DATETIME;
ALTER TABLE "Reporte" ADD COLUMN "lugar" TEXT;
ALTER TABLE "Reporte" ADD COLUMN "situacion" TEXT;
ALTER TABLE "Reporte" ADD COLUMN "actuacionInicial" TEXT;

CREATE INDEX IF NOT EXISTS "Reporte_docenteId_fecha_idx"
  ON "Reporte" ("docenteId", "fecha");

CREATE INDEX IF NOT EXISTS "Reporte_estudianteId_fecha_idx"
  ON "Reporte" ("estudianteId", "fecha");

CREATE INDEX IF NOT EXISTS "Reporte_estado_fecha_idx"
  ON "Reporte" ("estado", "fecha");

CREATE INDEX IF NOT EXISTS "EvidenciaReporte_reporteId_creadoEn_idx"
  ON "EvidenciaReporte" ("reporteId", "creadoEn");

CREATE INDEX IF NOT EXISTS "ObservacionReporte_reporteId_creadoEn_idx"
  ON "ObservacionReporte" ("reporteId", "creadoEn");
