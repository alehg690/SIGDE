// Prueba aislada: no usa la base institucional ni modifica credenciales reales.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
process.env.TURSO_DATABASE_URL = 'file::memory:';
process.env.JWT_SECRET = 'sigde-password-reset-isolated-test-secret';
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
  const { cambiarContrasena, hashPassword, verificarPassword } = require('../backend/src/services/auth.service.ts');
  const { actualizarUsuario } = require('../backend/src/services/usuarios.service.ts');
  const { crearToken } = require('../backend/src/utils/jwt.ts');
  const { autorizarRoles } = require('../backend/src/middleware/rol.middleware.ts');
  try {
    await db.executeMultiple(`
      CREATE TABLE Usuario (id INTEGER PRIMARY KEY, nombre TEXT, correo TEXT, contrasena TEXT, rol TEXT, activo INTEGER DEFAULT 1, creadoEn TEXT DEFAULT CURRENT_TIMESTAMP, ultimoAcceso TEXT, versionSesion INTEGER DEFAULT 1, requiereCambioContrasena INTEGER DEFAULT 0, tokenRecuperacion TEXT, tokenExpira TEXT, eliminadoEn TEXT);
      CREATE TABLE AuditLog (id INTEGER PRIMARY KEY, usuarioId INTEGER, accion TEXT, entidad TEXT, entidadId TEXT, detalle TEXT);
      CREATE TABLE AuthRateLimit (clave TEXT PRIMARY KEY, tipo TEXT, intentos INTEGER DEFAULT 0, ventanaInicia TEXT, bloqueadoHasta TEXT, actualizadoEn TEXT);
    `);
    const oldHash = await hashPassword('AnteriorPrueba2026');
    for (const [id, rol] of [[1, 'Coordinador'], [2, 'Docente']]) {
      await db.execute({sql:'INSERT INTO Usuario (id,nombre,correo,contrasena,rol,tokenRecuperacion,tokenExpira) VALUES (?,?,?,?,?,?,?)', args:[id,rol,`${rol.toLowerCase()}@example.test`,oldHash,rol,'codigo-anterior','2099-01-01']});
    }
    const actor = { id:1,nombre:'Coordinador',correo:'coordinador@example.test',rol:'Coordinador',versionSesion:1 };
    const docente = { id:2,nombre:'Docente',correo:'docente@example.test',rol:'Docente',versionSesion:1 };
    const actorToken = await crearToken(actor);
    const originalToken = await crearToken(docente);
    assert.equal((await autorizarRoles(originalToken,['Coordinador'])).response.status,403);
    const input = {nombre:'Docente actualizado',correo:docente.correo,rol:'Docente',activo:true};
    assert.equal((await actualizarUsuario(2,{...input,contrasena:'corta'},actor)).status,400);
    assert.equal((await db.execute('SELECT contrasena FROM Usuario WHERE id=2')).rows[0].contrasena,oldHash);
    await actualizarUsuario(2,{...input,contrasena:''},actor);
    const unchanged = (await db.execute('SELECT * FROM Usuario WHERE id=2')).rows[0];
    assert.equal(unchanged.contrasena,oldHash);
    assert.equal(unchanged.tokenRecuperacion,'codigo-anterior');
    const beforeResetToken = await crearToken({...docente,versionSesion:Number(unchanged.versionSesion)});
    const result = await actualizarUsuario(2,{...input,contrasena:'NuevaPrueba2026'},actor);
    assert.equal(result.data.id,2);
    assert.equal('contrasena' in result.data,false);
    const changed = (await db.execute('SELECT * FROM Usuario WHERE id=2')).rows[0];
    assert.equal(await verificarPassword('NuevaPrueba2026',changed.contrasena),true);
    assert.equal(await verificarPassword('AnteriorPrueba2026',changed.contrasena),false);
    assert.equal(changed.tokenRecuperacion,null);
    assert.equal(changed.tokenExpira,null);
    assert.equal(Number(changed.requiereCambioContrasena),1);
    assert.equal(Number(changed.versionSesion),Number(unchanged.versionSesion)+1);
    assert.equal((await autorizarRoles(beforeResetToken)).response.status,401);
    assert.ok((await autorizarRoles(actorToken,['Coordinador'])).usuario);
    const audit = (await db.execute('SELECT detalle FROM AuditLog ORDER BY id DESC LIMIT 1')).rows[0].detalle;
    assert.equal(JSON.parse(audit).cambioContrasena,true);
    assert.equal(audit.includes('NuevaPrueba2026'),false);
    assert.equal(audit.includes(changed.contrasena),false);
    const { cambiarContrasenaPerfil, cerrarOtrasSesiones } = require('../backend/src/services/perfil.service.ts');
    const perfilDocente = { ...docente, versionSesion:Number(changed.versionSesion) };
    assert.equal((await cambiarContrasenaPerfil('incorrecta','PerfilPrueba2026',perfilDocente)).status,400);
    const cambioPerfil = await cambiarContrasenaPerfil('NuevaPrueba2026','PerfilPrueba2026',perfilDocente);
    assert.equal(cambioPerfil.status,200);
    const trasPerfil = (await db.execute('SELECT * FROM Usuario WHERE id=2')).rows[0];
    assert.equal(await verificarPassword('PerfilPrueba2026',trasPerfil.contrasena),true);
    assert.equal(Number(trasPerfil.versionSesion),Number(changed.versionSesion)+1);
    const cierre = await cerrarOtrasSesiones({...perfilDocente,versionSesion:Number(trasPerfil.versionSesion)});
    assert.equal(cierre.status,200);
    assert.equal(Number((await db.execute('SELECT versionSesion FROM Usuario WHERE id=2')).rows[0].versionSesion),Number(trasPerfil.versionSesion)+1);
    const recoveryCode = '654321';
    await db.execute({
      sql: 'UPDATE Usuario SET tokenRecuperacion = ?, tokenExpira = ? WHERE id = 2',
      args: [await hashPassword(recoveryCode), new Date(Date.now() + 60_000).toISOString()],
    });
    assert.ok((await cambiarContrasena(docente.correo, recoveryCode, 'RecuperadaPrueba2026', 'cliente-prueba')).data);
    assert.equal((await cambiarContrasena(docente.correo, recoveryCode, 'OtraPrueba2026', 'cliente-prueba')).status, 400);
    await actualizarUsuario(1,{nombre:actor.nombre,correo:actor.correo,rol:actor.rol,contrasena:'PropiaPrueba2026'},actor);
    assert.equal((await autorizarRoles(actorToken)).response.status,401);
    console.log('OK: contraseña opcional, validación, hash, revocación de sesiones y recuperación, aislamiento del actor y auditoría sin secretos.');
  } finally { db.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
