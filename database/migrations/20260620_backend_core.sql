-- Backend core additions for SIGDE disciplinary workflow.
-- Idempotent intent: CREATE TABLE IF NOT EXISTS is safe; ALTER ADD COLUMN
-- statements are applied by scripts/apply-backend-core-migration.mjs only when
-- the column does not exist.

ALTER TABLE Estudiante ADD COLUMN documento TEXT;
ALTER TABLE Estudiante ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE Acudiente ADD COLUMN correo TEXT;
ALTER TABLE Acudiente ADD COLUMN telefono TEXT;
ALTER TABLE Acudiente ADD COLUMN documento TEXT;

ALTER TABLE Reporte ADD COLUMN evidenciaUrl TEXT;
ALTER TABLE Reporte ADD COLUMN observaciones TEXT;
ALTER TABLE Reporte ADD COLUMN editableHasta DATETIME;

CREATE TABLE IF NOT EXISTS Alerta (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  estudianteId INTEGER NOT NULL,
  cantidadReportes INTEGER NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activa',
  notas TEXT,
  creadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Alerta_estudianteId_fkey
    FOREIGN KEY (estudianteId) REFERENCES Estudiante (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS Notificacion (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  acudienteId INTEGER NOT NULL,
  reporteId INTEGER,
  canal TEXT NOT NULL,
  asunto TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  leida BOOLEAN NOT NULL DEFAULT false,
  enviadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT Notificacion_acudienteId_fkey
    FOREIGN KEY (acudienteId) REFERENCES Acudiente (id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT Notificacion_reporteId_fkey
    FOREIGN KEY (reporteId) REFERENCES Reporte (id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS AuditLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuarioId INTEGER NOT NULL,
  accion TEXT NOT NULL,
  entidad TEXT NOT NULL,
  entidadId TEXT,
  detalle TEXT,
  creadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT AuditLog_usuarioId_fkey
    FOREIGN KEY (usuarioId) REFERENCES Usuario (id)
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS ConfiguracionSistema (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  actualizadoEn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO ConfiguracionSistema (clave, valor)
VALUES
  ('alertas.umbralReportes', '3'),
  ('alertas.periodoDias', '30');
