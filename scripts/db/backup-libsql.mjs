import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createClient } from '@libsql/client';

function option(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

function quoteIdentifier(value) {
  return `"${value.replaceAll('"', '""')}"`;
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('La base contiene un número no finito');
    return String(value);
  }
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof ArrayBuffer) {
    return `X'${Buffer.from(value).toString('hex')}'`;
  }
  if (ArrayBuffer.isView(value)) {
    return `X'${Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('hex')}'`;
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function canonicalValue(value) {
  if (value === null || value === undefined) return ['null'];
  if (typeof value === 'bigint') return ['bigint', value.toString()];
  if (typeof value === 'number') return ['number', String(value)];
  if (typeof value === 'boolean') return ['boolean', value ? '1' : '0'];
  if (value instanceof ArrayBuffer) return ['blob', Buffer.from(value).toString('base64')];
  if (ArrayBuffer.isView(value)) {
    return ['blob', Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('base64')];
  }
  return ['string', String(value)];
}

function hashRows(rows, columns) {
  const canonicalRows = rows.map((row) => JSON.stringify(columns.map((column) => canonicalValue(row[column]))));
  canonicalRows.sort();
  return createHash('sha256').update(canonicalRows.join('\n')).digest('hex');
}

function terminated(statement) {
  return `${statement.trim().replace(/;$/, '')};`;
}

async function tableColumns(client, tableName) {
  const result = await client.execute(`PRAGMA table_xinfo(${sqlLiteral(tableName)})`);
  return result.rows
    .filter((column) => Number(column.hidden || 0) === 0)
    .map((column) => String(column.name));
}

async function readTable(client, tableName, columns) {
  if (!columns.length) return [];
  const projection = columns.map(quoteIdentifier).join(', ');
  const result = await client.execute(`SELECT ${projection} FROM ${quoteIdentifier(tableName)}`);
  return result.rows;
}

async function verifyRestore(dumpPath, manifest) {
  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'sigde-restore-'));
  const databasePath = join(temporaryDirectory, 'restored.db');
  const restored = createClient({ url: `file:${databasePath}` });

  try {
    await restored.executeMultiple(await readFile(dumpPath, 'utf8'));
    const integrity = await restored.execute('PRAGMA integrity_check');
    const integrityStatus = String(integrity.rows[0]?.integrity_check || 'unknown');
    if (integrityStatus !== 'ok') throw new Error(`La restauración no pasó integrity_check: ${integrityStatus}`);

    const foreignKeys = await restored.execute('PRAGMA foreign_key_check');
    if (foreignKeys.rows.length) {
      throw new Error(`La restauración contiene ${foreignKeys.rows.length} violaciones de claves foráneas`);
    }

    for (const [tableName, expected] of Object.entries(manifest.tables)) {
      const rows = await readTable(restored, tableName, expected.columns);
      const actualHash = hashRows(rows, expected.columns);
      if (rows.length !== expected.rowCount || actualHash !== expected.sha256) {
        throw new Error(`La verificación de ${tableName} no coincide con el origen`);
      }
    }

    return {
      status: 'ok',
      integrityCheck: integrityStatus,
      foreignKeyViolations: 0,
      verifiedTables: Object.keys(manifest.tables).length,
      verifiedRows: manifest.totalRows,
      verifiedAt: new Date().toISOString(),
    };
  } finally {
    restored.close();
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

const timestamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const outputDirectory = resolve(option('--output-dir') || join('backups', timestamp));
const dumpPath = join(outputDirectory, 'backup.sql');
const manifestPath = join(outputDirectory, 'manifest.json');
const verificationPath = join(outputDirectory, 'verification.json');

const source = createClient({
  url: requiredEnvironment('TURSO_DATABASE_URL'),
  authToken: requiredEnvironment('TURSO_AUTH_TOKEN'),
});

try {
  await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  const schemaResult = await source.execute(`
    SELECT type, name, sql
    FROM sqlite_schema
    WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%'
    ORDER BY CASE type WHEN 'table' THEN 0 WHEN 'index' THEN 1 WHEN 'view' THEN 2 ELSE 3 END, name
  `);
  const schema = schemaResult.rows.map((row) => ({
    type: String(row.type),
    name: String(row.name),
    sql: String(row.sql),
  }));
  const tables = schema.filter((entry) => entry.type === 'table');
  const manifest = {
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    schemaSha256: createHash('sha256').update(schema.map((entry) => entry.sql).join('\n')).digest('hex'),
    totalRows: 0,
    tables: {},
  };
  const statements = [
    '-- SIGDE portable libSQL backup',
    `-- Created at ${manifest.createdAt}`,
    'PRAGMA foreign_keys=OFF;',
    'BEGIN TRANSACTION;',
  ];

  for (const table of tables) statements.push(terminated(table.sql));

  for (const table of tables) {
    const columns = await tableColumns(source, table.name);
    const rows = await readTable(source, table.name, columns);
    manifest.tables[table.name] = {
      columns,
      rowCount: rows.length,
      sha256: hashRows(rows, columns),
    };
    manifest.totalRows += rows.length;

    if (!columns.length) continue;
    const columnList = columns.map(quoteIdentifier).join(', ');
    for (const row of rows) {
      const values = columns.map((column) => sqlLiteral(row[column])).join(', ');
      statements.push(`INSERT INTO ${quoteIdentifier(table.name)} (${columnList}) VALUES (${values});`);
    }
  }

  for (const entry of schema.filter((item) => item.type !== 'table')) {
    statements.push(terminated(entry.sql));
  }
  statements.push('COMMIT;', 'PRAGMA foreign_keys=ON;', '');

  await writeFile(dumpPath, statements.join('\n'), { encoding: 'utf8', mode: 0o600 });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  const verification = await verifyRestore(dumpPath, manifest);
  await writeFile(verificationPath, `${JSON.stringify(verification, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });

  console.log(JSON.stringify({
    status: 'ok',
    outputDirectory,
    tables: verification.verifiedTables,
    rows: verification.verifiedRows,
    integrityCheck: verification.integrityCheck,
  }));
} finally {
  source.close();
}
