import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Falta TURSO_DATABASE_URL en el entorno.');

const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

const columnas = await db.execute('PRAGMA table_info("Usuario")');
const tieneVersionSesion = columnas.rows.some((columna) => String(columna.name) === 'versionSesion');

if (!tieneVersionSesion) {
  await db.execute('ALTER TABLE "Usuario" ADD COLUMN "versionSesion" INTEGER NOT NULL DEFAULT 1');
}

await db.execute(`
  CREATE TABLE IF NOT EXISTS "AuthRateLimit" (
    "clave" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "intentos" INTEGER NOT NULL DEFAULT 0,
    "ventanaInicia" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bloqueadoHasta" DATETIME,
    "actualizadoEn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

await db.execute(`
  CREATE INDEX IF NOT EXISTS "AuthRateLimit_tipo_actualizadoEn_idx"
  ON "AuthRateLimit"("tipo", "actualizadoEn")
`);

console.log('Migración de seguridad de autenticación aplicada correctamente.');
