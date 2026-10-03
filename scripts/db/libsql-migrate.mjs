import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { createClient } from '@libsql/client';

const command = process.argv[2] || 'apply';
const migrationsDirectory = new URL('../../database/libsql-migrations/', import.meta.url);
const supportedCommands = new Set(['apply', 'status', 'dry-run']);

if (!supportedCommands.has(command)) throw new Error('Uso: db:migrate [apply|status|dry-run]');
if (process.env.APP_ENV !== 'staging' || process.env.NODE_ENV !== 'production') {
  throw new Error('El migrador de staging requiere APP_ENV=staging y NODE_ENV=production');
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url?.includes('sigde-staging-') || !authToken) {
  throw new Error('La configuración no identifica una base Turso exclusiva de staging');
}

const db = createClient({ url, authToken });

function checksum(sql) {
  return createHash('sha256').update(sql).digest('hex');
}

function statements(sql) {
  return sql.split(';').map((statement) => statement.trim()).filter(Boolean);
}

async function loadMigrations() {
  const entries = (await readdir(migrationsDirectory)).filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/i.test(name)).sort();
  if (!entries.length) throw new Error('No hay migraciones libSQL disponibles');
  const migrations = await Promise.all(entries.map(async (file) => {
    const sql = await readFile(new URL(file, migrationsDirectory), 'utf8');
    const [version, name] = file.slice(0, -4).split('_', 2);
    return { version, name, file, sql, checksum: checksum(sql) };
  }));
  migrations.forEach((migration, index) => {
    if (Number(migration.version) !== index + 1) throw new Error(`Secuencia de migraciones incompleta en ${migration.file}`);
  });
  return migrations;
}

async function historyExists() {
  const result = await db.execute("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'schema_migrations'");
  return result.rows.length > 0;
}

async function readHistory() {
  if (!await historyExists()) return [];
  const result = await db.execute('SELECT version, name, checksum FROM schema_migrations ORDER BY version');
  return result.rows.map((row) => ({ version: String(row.version), name: String(row.name), checksum: String(row.checksum) }));
}

async function report(migrations) {
  const history = await readHistory();
  const applied = new Map(history.map((item) => [item.version, item]));
  const local = new Set(migrations.map((item) => item.version));
  const missing = history.filter((item) => !local.has(item.version));
  const modified = migrations.filter((item) => applied.has(item.version) && applied.get(item.version).checksum !== item.checksum);
  const pending = migrations.filter((item) => !applied.has(item.version));
  return { applied, missing, modified, pending };
}

async function ensureMetadata() {
  await db.batch([
    { sql: 'CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, name TEXT NOT NULL, checksum TEXT NOT NULL, applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, execution_time_ms INTEGER NOT NULL)' },
    { sql: 'CREATE TABLE IF NOT EXISTS schema_migration_lock (id INTEGER PRIMARY KEY CHECK (id = 1), touched_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)' },
    { sql: 'INSERT OR IGNORE INTO schema_migration_lock (id) VALUES (1)' },
  ], 'write');
}

const migrations = await loadMigrations();
let state = await report(migrations);
if (state.missing.length || state.modified.length) {
  throw new Error(`Historial inconsistente: missing=${state.missing.map((item) => item.version).join(',') || 'none'}, modified=${state.modified.map((item) => item.version).join(',') || 'none'}`);
}

if (command !== 'apply') {
  console.log(`Applied: ${migrations.length - state.pending.length}`);
  console.log(`Pending: ${state.pending.map((item) => item.file).join(', ') || 'none'}`);
  console.log('Modified: none');
  console.log('Missing: none');
  db.close();
  process.exit(0);
}

await ensureMetadata();
const transaction = await db.transaction('write');
try {
  await transaction.execute('UPDATE schema_migration_lock SET touched_at = CURRENT_TIMESTAMP WHERE id = 1');
  const history = await transaction.execute('SELECT version, checksum FROM schema_migrations ORDER BY version');
  const applied = new Map(history.rows.map((row) => [String(row.version), String(row.checksum)]));
  for (const migration of migrations) {
    const existingChecksum = applied.get(migration.version);
    if (existingChecksum && existingChecksum !== migration.checksum) throw new Error(`Checksum modificado: ${migration.file}`);
    if (existingChecksum) continue;
    const startedAt = Date.now();
    for (const sql of statements(migration.sql)) await transaction.execute(sql);
    await transaction.execute({ sql: 'INSERT INTO schema_migrations (version, name, checksum, execution_time_ms) VALUES (?, ?, ?, ?)', args: [migration.version, migration.name, migration.checksum, Date.now() - startedAt] });
    console.log(`Applied: ${migration.file}`);
  }
  await transaction.commit();
} catch (error) {
  await transaction.rollback();
  throw error;
} finally {
  db.close();
}
