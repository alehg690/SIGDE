CREATE TABLE "GmailIntegration" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "correo" TEXT NOT NULL,
    "refreshTokenCifrado" TEXT NOT NULL,
    "conectadoPorId" INTEGER NOT NULL,
    "conectadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimaSincronizacionEn" DATETIME,
    "ultimoError" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    FOREIGN KEY ("conectadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT
);

CREATE TABLE "GmailProcessedMessage" (
    "messageId" TEXT NOT NULL PRIMARY KEY,
    "threadId" TEXT,
    "asunto" TEXT NOT NULL,
    "comunicacionId" INTEGER,
    "eventosJson" TEXT,
    "accion" TEXT NOT NULL DEFAULT 'comunicacion',
    "procesadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("comunicacionId") REFERENCES "Comunicacion" ("id") ON DELETE SET NULL
);

CREATE UNIQUE INDEX "GmailIntegration_correo_key" ON "GmailIntegration"("correo");
CREATE INDEX "GmailIntegration_activo_idx" ON "GmailIntegration"("activo");

CREATE TABLE "HorarioInstitucional" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "periodo" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "origenMessageId" TEXT,
    "actualizadoPorId" INTEGER NOT NULL,
    "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("actualizadoPorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT
);

CREATE TABLE "HorarioInstitucionalArchivo" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "horarioId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "tamano" INTEGER NOT NULL,
    "contenido" BLOB NOT NULL,
    FOREIGN KEY ("horarioId") REFERENCES "HorarioInstitucional" ("id") ON DELETE CASCADE
);

CREATE UNIQUE INDEX "HorarioInstitucional_origenMessageId_key" ON "HorarioInstitucional"("origenMessageId");
CREATE INDEX "HorarioInstitucional_activo_creadoEn_idx" ON "HorarioInstitucional"("activo", "creadoEn");
