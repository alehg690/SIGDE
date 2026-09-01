ALTER TABLE "Estudiante" ADD COLUMN "correo" TEXT;
CREATE UNIQUE INDEX "Estudiante_correo_key" ON "Estudiante"("correo");

CREATE TABLE "GrupoEscolar" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "grado" TEXT NOT NULL,
  "grupo" TEXT NOT NULL,
  "jornada" TEXT NOT NULL,
  "directorId" INTEGER,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GrupoEscolar_directorId_fkey" FOREIGN KEY ("directorId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "GrupoEscolar_grado_grupo_key" ON "GrupoEscolar"("grado", "grupo");
CREATE INDEX "GrupoEscolar_directorId_idx" ON "GrupoEscolar"("directorId");

CREATE TABLE "NotificacionUsuario" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "usuarioId" INTEGER NOT NULL,
  "reporteId" INTEGER,
  "canal" TEXT NOT NULL,
  "asunto" TEXT NOT NULL,
  "mensaje" TEXT NOT NULL,
  "leida" BOOLEAN NOT NULL DEFAULT false,
  "enviadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "NotificacionUsuario_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "NotificacionUsuario_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "Reporte" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "NotificacionUsuario_usuarioId_leida_idx" ON "NotificacionUsuario"("usuarioId", "leida");

INSERT INTO "GrupoEscolar" ("grado", "grupo", "jornada") VALUES
('6','1','Mañana'),('6','2','Mañana'),('6','3','Mañana'),('6','4','Tarde'),('6','5','Tarde'),
('7','1','Mañana'),('7','2','Mañana'),('7','3','Mañana'),('7','4','Tarde'),('7','5','Tarde'),('7','6','Tarde'),
('8','1','Mañana'),('8','2','Mañana'),('8','3','Tarde'),('8','4','Tarde'),('8','5','Tarde'),
('9','1','Mañana'),('9','2','Mañana'),('9','3','Tarde'),('9','4','Tarde'),
('10','1','Mañana'),('10','2','Mañana'),('10','3','Tarde'),('10','4','Tarde'),
('11','1','Mañana'),('11','2','Mañana'),('11','3','Tarde'),('11','4','Tarde');
