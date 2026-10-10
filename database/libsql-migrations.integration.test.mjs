import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';
import { createClient } from '@libsql/client';

test('las migraciones libSQL normalizan roles heredados y conservan la integridad', async () => {
  const db = createClient({ url: 'file::memory:' });
  try {
    const directory = new URL('./libsql-migrations/', import.meta.url);
    const migrations = (await readdir(directory)).filter((name) => name.endsWith('.sql')).sort();

    for (const name of migrations) {
      if (name === '0003_normalize_user_roles.sql') {
        await db.execute({
          sql: 'INSERT INTO Usuario(nombre, correo, contrasena, rol, versionSesion) VALUES (?, ?, ?, ?, ?)',
          args: ['Cuenta heredada', 'legacy-role@example.test', 'no-utilizable', 'Admin', 4],
        });
      }
      await db.executeMultiple(await readFile(new URL(name, directory), 'utf8'));
    }

    const result = await db.execute({
      sql: 'SELECT rol, versionSesion FROM Usuario WHERE correo = ?',
      args: ['legacy-role@example.test'],
    });
    assert.equal(result.rows[0]?.rol, 'Admin');
    assert.equal(Number(result.rows[0]?.versionSesion), 6);

    const integrity = await db.execute('PRAGMA integrity_check');
    assert.equal(integrity.rows[0]?.integrity_check, 'ok');
  } finally {
    db.close();
  }
});
