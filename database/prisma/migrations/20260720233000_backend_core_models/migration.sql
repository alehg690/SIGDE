-- Backend core domain models.
-- This migration is intentionally idempotent because some development
-- databases already received these tables through database/migrations scripts.

CREATE TABLE IF NOT EXISTS "Acudiente" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "nombre" TEXT NOT NULL,
  "contacto" TEXT NOT NULL,
  "correo" TEXT,
  "telefono" TEXT,
  "documento" TEXT,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Estudiante" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "nombre" TEXT NOT NULL,
  "documento" TEXT,
  "grado" TEXT NOT NULL,
  "grupo" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'Activo',
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "archivado" BOOLEAN NOT NULL DEFAULT false,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acudienteId" INTEGER NOT NULL,
  CONSTRAINT "Estudiante_acudienteId_fkey"
    FOREIGN KEY ("acudienteId") REFERENCES "Acudiente" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Reporte" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "estudianteId" INTEGER NOT NULL,
  "docenteId" INTEGER NOT NULL,
  "tipoFalta" TEXT NOT NULL,
  "descripcion" TEXT NOT NULL,
  "evidenciaUrl" TEXT,
  "observaciones" TEXT,
  "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "estado" TEXT NOT NULL DEFAULT 'Pendiente',
  "confidencial" BOOLEAN NOT NULL DEFAULT false,
  "editableHasta" DATETIME,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Reporte_estudianteId_fkey"
    FOREIGN KEY ("estudianteId") REFERENCES "Estudiante" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Reporte_docenteId_fkey"
    FOREIGN KEY ("docenteId") REFERENCES "Usuario" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Alerta" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "estudianteId" INTEGER NOT NULL,
  "cantidadReportes" INTEGER NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'activa',
  "notas" TEXT,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Alerta_estudianteId_fkey"
    FOREIGN KEY ("estudianteId") REFERENCES "Estudiante" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Salida" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "estudianteId" INTEGER NOT NULL,
  "acudienteId" INTEGER NOT NULL,
  "motivo" TEXT NOT NULL,
  "tipo" TEXT NOT NULL DEFAULT 'ordinaria',
  "urgencia" BOOLEAN NOT NULL DEFAULT false,
  "estado" TEXT NOT NULL DEFAULT 'pendiente',
  "firmaDirector" BOOLEAN NOT NULL DEFAULT false,
  "firmaDocente" BOOLEAN NOT NULL DEFAULT false,
  "firmaCoordinacion" BOOLEAN NOT NULL DEFAULT false,
  "firmaAcudiente" BOOLEAN NOT NULL DEFAULT false,
  "registradoPorId" INTEGER NOT NULL,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Salida_estudianteId_fkey"
    FOREIGN KEY ("estudianteId") REFERENCES "Estudiante" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Salida_acudienteId_fkey"
    FOREIGN KEY ("acudienteId") REFERENCES "Acudiente" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Salida_registradoPorId_fkey"
    FOREIGN KEY ("registradoPorId") REFERENCES "Usuario" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Notificacion" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "acudienteId" INTEGER NOT NULL,
  "reporteId" INTEGER,
  "canal" TEXT NOT NULL,
  "asunto" TEXT NOT NULL,
  "mensaje" TEXT NOT NULL,
  "leida" BOOLEAN NOT NULL DEFAULT false,
  "enviadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notificacion_acudienteId_fkey"
    FOREIGN KEY ("acudienteId") REFERENCES "Acudiente" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Notificacion_reporteId_fkey"
    FOREIGN KEY ("reporteId") REFERENCES "Reporte" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "usuarioId" INTEGER NOT NULL,
  "accion" TEXT NOT NULL,
  "entidad" TEXT NOT NULL,
  "entidadId" TEXT,
  "detalle" TEXT,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ConfiguracionSistema" (
  "clave" TEXT NOT NULL PRIMARY KEY,
  "valor" TEXT NOT NULL,
  "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "EvidenciaReporte" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "reporteId" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EvidenciaReporte_reporteId_fkey"
    FOREIGN KEY ("reporteId") REFERENCES "Reporte" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ObservacionReporte" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "reporteId" INTEGER NOT NULL,
  "usuarioId" INTEGER NOT NULL,
  "texto" TEXT NOT NULL,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ObservacionReporte_reporteId_fkey"
    FOREIGN KEY ("reporteId") REFERENCES "Reporte" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ObservacionReporte_usuarioId_fkey"
    FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Estudiante_acudienteId_idx" ON "Estudiante" ("acudienteId");
CREATE INDEX IF NOT EXISTS "Reporte_estudianteId_idx" ON "Reporte" ("estudianteId");
CREATE INDEX IF NOT EXISTS "Reporte_docenteId_idx" ON "Reporte" ("docenteId");
CREATE INDEX IF NOT EXISTS "Alerta_estudianteId_idx" ON "Alerta" ("estudianteId");
CREATE INDEX IF NOT EXISTS "Salida_estudianteId_idx" ON "Salida" ("estudianteId");
CREATE INDEX IF NOT EXISTS "Salida_acudienteId_idx" ON "Salida" ("acudienteId");
CREATE INDEX IF NOT EXISTS "Salida_registradoPorId_idx" ON "Salida" ("registradoPorId");
CREATE INDEX IF NOT EXISTS "Notificacion_acudienteId_idx" ON "Notificacion" ("acudienteId");
CREATE INDEX IF NOT EXISTS "Notificacion_reporteId_idx" ON "Notificacion" ("reporteId");
CREATE INDEX IF NOT EXISTS "AuditLog_usuarioId_idx" ON "AuditLog" ("usuarioId");

INSERT OR IGNORE INTO "ConfiguracionSistema" ("clave", "valor")
VALUES
  ('alertas.umbralReportes', '3'),
  ('alertas.periodoDias', '30');
