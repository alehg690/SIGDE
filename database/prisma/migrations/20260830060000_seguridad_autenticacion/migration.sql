ALTER TABLE "Usuario" ADD COLUMN "versionSesion" INTEGER NOT NULL DEFAULT 1;

CREATE TABLE "AuthRateLimit" (
  "clave" TEXT NOT NULL PRIMARY KEY,
  "tipo" TEXT NOT NULL,
  "intentos" INTEGER NOT NULL DEFAULT 0,
  "ventanaInicia" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "bloqueadoHasta" DATETIME,
  "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "AuthRateLimit_tipo_actualizadoEn_idx"
ON "AuthRateLimit"("tipo", "actualizadoEn");
