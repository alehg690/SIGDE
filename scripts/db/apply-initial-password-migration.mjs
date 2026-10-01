import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Falta TURSO_DATABASE_URL en el entorno.');
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

try {
  const result = await db.execute('PRAGMA table_info("Usuario")');
  if (!result.rows.some((row) => String(row.name) === 'requiereCambioContrasena')) {
    await db.execute('ALTER TABLE "Usuario" ADD COLUMN "requiereCambioContrasena" BOOLEAN NOT NULL DEFAULT false');
  }
  console.log('Migración de cambio de contraseña inicial aplicada.');
} finally {
  db.close();
}
