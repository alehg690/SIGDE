-- Datos requeridos por el registro de salidas autorizadas.
ALTER TABLE Estudiante ADD COLUMN jornada TEXT NOT NULL DEFAULT 'Sin registrar';

ALTER TABLE Salida ADD COLUMN recogeNombre TEXT;
ALTER TABLE Salida ADD COLUMN recogeApellido TEXT;
ALTER TABLE Salida ADD COLUMN recogeCedula TEXT;
ALTER TABLE Salida ADD COLUMN recogeParentesco TEXT;
ALTER TABLE Salida ADD COLUMN recogeCorreo TEXT;

CREATE TABLE IF NOT EXISTS EstudianteAcudiente (
  estudianteId INTEGER NOT NULL,
  acudienteId INTEGER NOT NULL,
  esPrincipal BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (estudianteId, acudienteId),
  FOREIGN KEY (estudianteId) REFERENCES Estudiante(id) ON DELETE CASCADE,
  FOREIGN KEY (acudienteId) REFERENCES Acudiente(id) ON DELETE CASCADE
);
INSERT OR IGNORE INTO EstudianteAcudiente (estudianteId, acudienteId, esPrincipal)
SELECT id, acudienteId, true FROM Estudiante;
