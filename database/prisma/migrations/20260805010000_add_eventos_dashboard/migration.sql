CREATE TABLE IF NOT EXISTS "Evento" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "titulo" TEXT NOT NULL,
  "descripcion" TEXT,
  "ubicacion" TEXT,
  "iniciaEn" DATETIME NOT NULL,
  "finalizaEn" DATETIME,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "Evento_iniciaEn_activo_idx" ON "Evento" ("iniciaEn", "activo");
