CREATE TABLE "AuditLog_new" (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "usuarioId" INTEGER,
  "usuarioNombre" TEXT,
  "accion" TEXT NOT NULL,
  "entidad" TEXT NOT NULL,
  "entidadId" TEXT,
  "detalle" TEXT,
  "creadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "AuditLog_new" (id, usuarioId, usuarioNombre, accion, entidad, entidadId, detalle, creadoEn)
SELECT a.id, a.usuarioId, u.nombre, a.accion, a.entidad, a.entidadId, a.detalle, a.creadoEn
FROM AuditLog a LEFT JOIN Usuario u ON u.id = a.usuarioId;
DROP TABLE "AuditLog";
ALTER TABLE "AuditLog_new" RENAME TO "AuditLog";
