import { createHash } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

if (process.env.APP_ENV !== 'staging' || process.env.NODE_ENV !== 'production' || process.env.EMAIL_ENABLED !== 'false') {
  throw new Error('El seed de staging requiere APP_ENV=staging, NODE_ENV=production y EMAIL_ENABLED=false');
}
if (!process.env.TURSO_DATABASE_URL?.includes('sigde-staging-') || !process.env.TURSO_AUTH_TOKEN || !process.env.STAGING_ADMIN_PASSWORD) {
  throw new Error('Falta configuración exclusiva de staging para el seed');
}

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const email = 'admin@sigde-staging.invalid';
const passwordHash = await bcrypt.hash(process.env.STAGING_ADMIN_PASSWORD, 10);

try {
  await db.batch([
    { sql: "INSERT OR IGNORE INTO ConfiguracionSistema (clave, valor) VALUES ('alertas.umbralReportes', '3')" },
    { sql: "INSERT OR IGNORE INTO ConfiguracionSistema (clave, valor) VALUES ('alertas.periodoDias', '30')" },
    { sql: 'INSERT OR IGNORE INTO Usuario (nombre, correo, contrasena, rol, activo) VALUES (?, ?, ?, ?, 1)', args: ['Staging Administrator', email, passwordHash, 'Coordinador'] },
  ], 'write');
  console.log('STAGING_SYNTHETIC_SEED_READY');
} finally {
  db.close();
}
