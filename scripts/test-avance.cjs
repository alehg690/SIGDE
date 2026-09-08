// Ejecutar con node scripts/test-avance.cjs. Usa exclusivamente SQLite en memoria.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
process.env.TURSO_DATABASE_URL = 'file::memory:';
delete process.env.TURSO_AUTH_TOKEN;
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) {
  return resolve.call(this, id.startsWith('@backend/') ? path.join(root, 'backend/src', id.slice(9)) : id, ...args);
};
require.extensions['.ts'] = function (module, filename) {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText, filename);
};

async function main() {
  const { db } = require('../backend/src/config/database.ts');
  try {
    await db.executeMultiple(`
      CREATE TABLE Usuario (id INTEGER PRIMARY KEY, nombre TEXT, correo TEXT, rol TEXT, activo INTEGER);
      INSERT INTO Usuario VALUES (1, 'Docente demo', 'demo@example.test', 'Docente', 1), (2, 'Otra persona', 'otra@example.test', 'Coordinador', 1);
      CREATE TABLE ConfiguracionSistema (clave TEXT PRIMARY KEY, valor TEXT, actualizadoEn TEXT);
      CREATE TABLE AuditLog (id INTEGER PRIMARY KEY, usuarioId INTEGER, accion TEXT, entidad TEXT, entidadId TEXT, detalle TEXT);
      CREATE TABLE Evento (id INTEGER PRIMARY KEY, titulo TEXT, descripcion TEXT, ubicacion TEXT, iniciaEn TEXT, activo INTEGER DEFAULT 1);
      CREATE TABLE Estudiante (id INTEGER PRIMARY KEY, nombre TEXT, grado TEXT, grupo TEXT);
      CREATE TABLE Alerta (id INTEGER PRIMARY KEY, estudianteId INTEGER, estado TEXT, creadoEn TEXT);
      INSERT INTO Estudiante VALUES (1, 'Estudiante demo', '11', '2');
      INSERT INTO Alerta VALUES (1, 1, 'activa', '2026-01-01'), (2, 1, 'resuelta', '2026-01-02');
    `);
    const usuario = { id: 1, nombre: 'Docente demo', correo: 'demo@example.test', rol: 'Docente', versionSesion: 1 };
    const { actualizarPerfil } = require('../backend/src/services/perfil.service.ts');
    assert.equal((await actualizarPerfil('  ', usuario)).status, 400);
    assert.equal((await actualizarPerfil('Nombre actualizado', usuario)).status, 200);
    const cuentas = (await db.execute('SELECT * FROM Usuario ORDER BY id')).rows;
    assert.equal(cuentas[0].nombre, 'Nombre actualizado');
    assert.equal(cuentas[0].rol, 'Docente');
    assert.equal(cuentas[1].nombre, 'Otra persona');

    const { actualizarConfiguraciones } = require('../backend/src/services/configuracion.service.ts');
    const entradas = [{ clave: 'institucion.nombre', valor: 'Colegio demo' }, { clave: 'institucion.anoLectivo', valor: '2026' }, { clave: 'alertas.umbralReportes', valor: '3' }, { clave: 'alertas.periodoDias', valor: '30' }];
    assert.equal((await actualizarConfiguraciones(entradas, usuario)).status, 200);
    assert.equal((await actualizarConfiguraciones([{ clave: 'alertas.umbralReportes', valor: '0' }], usuario)).status, 400);
    assert.equal((await actualizarConfiguraciones([{ clave: 'clave.desconocida', valor: '1' }], usuario)).status, 400);
    assert.equal((await actualizarConfiguraciones([entradas[0], entradas[0]], usuario)).status, 400);
    await db.execute("CREATE TRIGGER fail_config BEFORE UPDATE ON ConfiguracionSistema WHEN NEW.clave = 'alertas.periodoDias' BEGIN SELECT RAISE(ABORT, 'fallo simulado'); END");
    await assert.rejects(() => actualizarConfiguraciones([{ clave: 'institucion.nombre', valor: 'No debe guardarse' }, { clave: 'alertas.periodoDias', valor: '60' }], usuario));
    assert.equal((await db.execute("SELECT valor FROM ConfiguracionSistema WHERE clave = 'institucion.nombre'")).rows[0].valor, 'Colegio demo');

    const { crearEvento, listarEventosProximos } = require('../backend/src/services/eventos.service.ts');
    assert.equal((await crearEvento({ titulo: 'Demo', iniciaEn: 'fecha incorrecta' }, usuario)).status, 400);
    assert.equal((await crearEvento({ titulo: 'x'.repeat(121), iniciaEn: new Date().toISOString() }, usuario)).status, 400);
    const futuro = new Date(Date.now() + 86400000).toISOString();
    assert.equal((await crearEvento({ titulo: 'Reunión', iniciaEn: futuro, ubicacion: 'Aula 1' }, usuario)).status, 201);
    await crearEvento({ titulo: 'Pasado', iniciaEn: '2000-01-01T00:00:00Z' }, usuario);
    const agenda = (await listarEventosProximos()).data;
    assert.equal(agenda.length, 1); assert.equal(agenda[0].iniciaEn, futuro);
    const { listarAlertasActivas } = require('../backend/src/services/alertas.service.ts');
    assert.equal((await listarAlertasActivas()).data.length, 1);
    assert.equal((await listarAlertasActivas(true)).data.length, 2);
    console.log('OK: perfil aislado por sesión; validación y rollback de configuración; fechas y persistencia de eventos; historial de alertas.');
  } finally { db.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
