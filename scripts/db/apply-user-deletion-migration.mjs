import { createClient } from '@libsql/client';
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  const columns = (await db.execute('PRAGMA table_info("Usuario")')).rows;
  if (!columns.some(c => c.name === 'eliminadoEn')) {
    await db.execute('ALTER TABLE "Usuario" ADD COLUMN "eliminadoEn" DATETIME');
  }
  console.log('Migración de eliminación de cuentas aplicada.');
} finally { db.close(); }
