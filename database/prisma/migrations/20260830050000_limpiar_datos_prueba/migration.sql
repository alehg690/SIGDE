DROP TABLE IF EXISTS "_ReportesPrueba";
DROP TABLE IF EXISTS "_UsuariosPrueba";
DROP TABLE IF EXISTS "_EstudiantesPrueba";

CREATE TEMP TABLE "_EstudiantesPrueba" AS
SELECT "id", "acudienteId" FROM "Estudiante"
WHERE "documento" LIKE 'DEMO-EST-%'
   OR ("nombre" = 'Alejandro' AND "documento" IS NULL AND "correo" IS NULL);

CREATE TEMP TABLE "_UsuariosPrueba" AS
SELECT "id" FROM "Usuario"
WHERE "correo" LIKE 'demo.%@sigde.local'
   OR "correo" = 'docente@sgde.com';

CREATE TEMP TABLE "_ReportesPrueba" AS
SELECT "id" FROM "Reporte"
WHERE "estudianteId" IN (SELECT "id" FROM "_EstudiantesPrueba")
   OR "docenteId" IN (SELECT "id" FROM "_UsuariosPrueba");

DELETE FROM "NotificacionUsuario" WHERE "reporteId" IN (SELECT "id" FROM "_ReportesPrueba") OR "usuarioId" IN (SELECT "id" FROM "_UsuariosPrueba");
DELETE FROM "Notificacion" WHERE "reporteId" IN (SELECT "id" FROM "_ReportesPrueba") OR "acudienteId" IN (SELECT "acudienteId" FROM "_EstudiantesPrueba");
DELETE FROM "ObservacionReporte" WHERE "reporteId" IN (SELECT "id" FROM "_ReportesPrueba") OR "usuarioId" IN (SELECT "id" FROM "_UsuariosPrueba");
DELETE FROM "EvidenciaReporte" WHERE "reporteId" IN (SELECT "id" FROM "_ReportesPrueba");
DELETE FROM "Alerta" WHERE "estudianteId" IN (SELECT "id" FROM "_EstudiantesPrueba");
DELETE FROM "Salida" WHERE "estudianteId" IN (SELECT "id" FROM "_EstudiantesPrueba") OR "registradoPorId" IN (SELECT "id" FROM "_UsuariosPrueba");
DELETE FROM "EstudianteAcudiente" WHERE "estudianteId" IN (SELECT "id" FROM "_EstudiantesPrueba");
DELETE FROM "Reporte" WHERE "id" IN (SELECT "id" FROM "_ReportesPrueba");
DELETE FROM "Estudiante" WHERE "id" IN (SELECT "id" FROM "_EstudiantesPrueba");
DELETE FROM "Acudiente" WHERE "id" IN (SELECT "acudienteId" FROM "_EstudiantesPrueba") AND "id" NOT IN (SELECT "acudienteId" FROM "Estudiante");
UPDATE "GrupoEscolar" SET "directorId" = NULL WHERE "directorId" IN (SELECT "id" FROM "_UsuariosPrueba");
DELETE FROM "AuditLog" WHERE "usuarioId" IN (SELECT "id" FROM "_UsuariosPrueba");
DELETE FROM "Usuario" WHERE "id" IN (SELECT "id" FROM "_UsuariosPrueba");
DELETE FROM "Evento" WHERE "titulo" LIKE '[DEMO] %';

DROP TABLE "_ReportesPrueba";
DROP TABLE "_UsuariosPrueba";
DROP TABLE "_EstudiantesPrueba";
