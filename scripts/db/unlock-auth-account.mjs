import { createHash } from 'crypto';
import { createClient } from '@libsql/client';

const correo = String(process.argv[2] || '').trim().replaceAll('\\@', '@').toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
  throw new Error('Uso: npm run auth:unlock -- usuario@institucion.edu.co');
}

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Falta TURSO_DATABASE_URL en el entorno.');

const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

const hash = createHash('sha256').update(correo).digest('hex');
const claves = ['login-cuenta', 'recuperacion-cuenta', 'codigo-cuenta']
  .map((tipo) => `${tipo}:${hash}`);

const existentes = await db.execute({
  sql: `SELECT COUNT(*) AS total FROM AuthRateLimit WHERE clave IN (?, ?, ?)`,
  args: claves,
});

await db.batch(
  claves.map((clave) => ({
    sql: 'DELETE FROM AuthRateLimit WHERE clave = ?',
    args: [clave],
  })),
  'write'
);

console.log(`Desbloqueo completado para ${correo}. Registros eliminados: ${Number(existentes.rows[0]?.total || 0)}.`);
