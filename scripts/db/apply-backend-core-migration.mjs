import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const migration = (await readFile('database/migrations/20260620_backend_core.sql', 'utf8'))
  .split('\n')
  .filter((line) => !line.trim().startsWith('--'))
  .join('\n');

async function hasColumn(table, column) {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => row.name === column);
}

for (const raw of migration.split(';')) {
  const sql = raw.trim();
  if (!sql || sql.startsWith('--')) continue;

  const alter = sql.match(/^ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(\w+)/i);
  if (alter) {
    const [, table, column] = alter;
    if (await hasColumn(table, column)) {
      console.log(`skip ${table}.${column}`);
      continue;
    }
  }

  await db.execute(sql);
  console.log(`ok ${sql.split(/\s+/).slice(0, 5).join(' ')}`);
}
