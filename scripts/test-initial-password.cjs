// Flujo aislado en memoria: no toca cuentas institucionales.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { decodeJwt } = require('jose');
process.env.TURSO_DATABASE_URL = 'file::memory:';
process.env.JWT_SECRET = 'sigde-initial-password-isolated-test-secret';
process.env.APP_ENV = 'development';
process.env.NODE_ENV = 'development';
process.env.EMAIL_ENABLED = 'false';
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
  const { crearUsuario } = require('../backend/src/services/usuarios.service.ts');
  const { login, cambiarContrasenaTemporal, verificarPassword } = require('../backend/src/services/auth.service.ts');
  const { crearToken } = require('../backend/src/utils/jwt.ts');
  const { autorizarRoles } = require('../backend/src/middleware/rol.middleware.ts');
  try {
    await db.executeMultiple(`
      CREATE TABLE Usuario (id INTEGER PRIMARY KEY, nombre TEXT, correo TEXT, contrasena TEXT, rol TEXT, activo INTEGER DEFAULT 1, creadoEn TEXT DEFAULT CURRENT_TIMESTAMP, ultimoAcceso TEXT, versionSesion INTEGER DEFAULT 1, requiereCambioContrasena INTEGER DEFAULT 0, tokenRecuperacion TEXT, tokenExpira TEXT, eliminadoEn TEXT);
      CREATE TABLE AuditLog (id INTEGER PRIMARY KEY, usuarioId INTEGER, accion TEXT, entidad TEXT, entidadId TEXT, detalle TEXT);
      CREATE TABLE AuthRateLimit (clave TEXT PRIMARY KEY, tipo TEXT, intentos INTEGER DEFAULT 0, ventanaInicia TEXT, bloqueadoHasta TEXT, actualizadoEn TEXT);
    `);
    const actor = { id: 99, nombre: 'Coordinador', correo: 'coordinador@example.test', rol: 'Coordinador', versionSesion: 1, requiereCambioContrasena: false };
    const creado = await crearUsuario({ nombre: 'Docente Prueba', correo: 'docente@example.test', rol: 'Docente', contrasena: 'TemporalSegura12345' }, actor);
    assert.equal(creado.status, 201);
    const sesion = await login('docente@example.test', 'TemporalSegura12345', 'test');
    assert.equal(sesion.data.requiereCambioContrasena, true);
    const token = await crearToken(sesion.data);
    const payload = decodeJwt(token);
    assert.deepEqual(
      Object.keys(payload).sort(),
      ['aud', 'exp', 'iat', 'id', 'iss', 'versionSesion'].sort(),
      'El JWT de sesión no debe contener nombre, correo, rol ni otros datos personales',
    );
    assert.equal((await autorizarRoles(token)).response.status, 403);
    assert.equal((await autorizarRoles(token, undefined, true)).usuario.requiereCambioContrasena, true);
    assert.equal((await cambiarContrasenaTemporal(creado.data.id, 1, 'incorrecta', 'NuevaSegura123456')).status, 400);
    assert.equal((await cambiarContrasenaTemporal(creado.data.id, 1, 'TemporalSegura12345', 'TemporalSegura12345')).status, 400);
    const cambio = await cambiarContrasenaTemporal(creado.data.id, 1, 'TemporalSegura12345', 'Nueva123');
    assert.equal(cambio.data.versionSesion, 2);
    assert.equal((await autorizarRoles(token)).response.status, 401);
    const usuario = (await db.execute({ sql: 'SELECT * FROM Usuario WHERE id = ?', args: [creado.data.id] })).rows[0];
    assert.equal(Number(usuario.requiereCambioContrasena), 0);
    assert.equal(await verificarPassword('Nueva123', usuario.contrasena), true);
    assert.ok((await autorizarRoles(await crearToken({ ...sesion.data, versionSesion: 2 })) ).usuario);
    console.log('OK: cuenta nueva bloqueada, clave temporal verificada, cambio obligatorio y sesión anterior revocada.');
  } finally { db.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
