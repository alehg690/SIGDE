import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
if (!url) throw new Error('Falta TURSO_DATABASE_URL en el entorno.');

const db = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

const migrationUrl = new URL('../../database/prisma/migrations/20260831000000_reportes_completos/migration.sql', import.meta.url);
const migration = await readFile(migrationUrl, 'utf8');

async function tieneColumna(tabla, columna) {
  const result = await db.execute(`PRAGMA table_info("${tabla}")`);
  return result.rows.some((row) => String(row.name) === columna);
}

for (const fragmento of migration.split(';')) {
  const sql = fragmento
    .split('\n')
    .filter((linea) => !linea.trim().startsWith('--'))
    .join('\n')
    .trim();
  if (!sql) continue;

  const alter = sql.match(/^ALTER TABLE\s+"?([A-Za-z0-9_]+)"?\s+ADD COLUMN\s+"?([A-Za-z0-9_]+)"?/i);
  if (alter && await tieneColumna(alter[1], alter[2])) continue;
  await db.execute(sql);
}

db.close();
console.log('Migración del módulo de reportes aplicada correctamente.');
