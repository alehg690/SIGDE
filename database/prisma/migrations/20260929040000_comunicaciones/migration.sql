CREATE TABLE "Comunicacion" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "titulo" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "destinatarios" TEXT NOT NULL,
  "contenido" TEXT NOT NULL,
  "estado" TEXT NOT NULL DEFAULT 'Borrador',
  "autorId" INTEGER NOT NULL,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "publicadoEn" DATETIME,
  "visualizaciones" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "Comunicacion_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "Comunicacion_estado_publicadoEn_idx" ON "Comunicacion"("estado", "publicadoEn");
CREATE TABLE "ComunicacionArchivo" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "comunicacionId" INTEGER NOT NULL,
  "nombre" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "tamano" INTEGER NOT NULL,
  "contenido" BLOB NOT NULL,
  CONSTRAINT "ComunicacionArchivo_comunicacionId_fkey" FOREIGN KEY ("comunicacionId") REFERENCES "Comunicacion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
