import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const migration = await readFile('database/migrations/20260819_salidas_autorizadas.sql', 'utf8');

async function hasColumn(table, column) {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => row.name === column);
}

for (const statement of migration.split(';')) {
  const sql = statement.split('\n').filter((line) => !line.trim().startsWith('--')).join('\n').trim();
  if (!sql) continue;
  const alter = sql.match(/^ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/i);
  if (alter && await hasColumn(alter[1], alter[2])) continue;
  await db.execute(sql);
  console.log(`ok ${sql.split(/\s+/).slice(0, 4).join(' ')}`);
}
