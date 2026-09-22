import { createClient } from '@libsql/client';
import { readFileSync } from 'node:fs';
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  const columns = (await db.execute('PRAGMA table_info("AuditLog")')).rows;
  if (columns.some(c => c.name === 'usuarioNombre') && columns.some(c => c.name === 'usuarioId' && Number(c.notnull) === 0)) {
    console.log('Migración ya aplicada.');
  } else {
    const sql = readFileSync(new URL('../../database/prisma/migrations/20260922000000_auditoria_usuario_eliminado/migration.sql', import.meta.url), 'utf8');
    await db.batch(sql.split(';').map(s => s.trim()).filter(Boolean), 'write');
    console.log('Migración aplicada; auditoría conservada.');
  }
} finally { db.close(); }
