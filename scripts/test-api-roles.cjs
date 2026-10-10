// Exercise real route handlers, JWT authorization and SQL against an isolated database.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
process.env.TURSO_DATABASE_URL = 'file::memory:';
process.env.JWT_SECRET = 'sigde-api-isolated-test-secret-2026';
process.env.APP_ENV = 'development';
process.env.NODE_ENV = 'development';
process.env.EMAIL_ENABLED = 'false';
delete process.env.TURSO_AUTH_TOKEN;
delete process.env.EMAIL_USER;
delete process.env.EMAIL_PASS;
const root = path.resolve(__dirname, '..');
let cookieToken;
const originalLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'next/headers') return { cookies: async () => ({ get: () => cookieToken ? { value: cookieToken } : undefined }) };
  return originalLoad.call(this, id, ...args);
};
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (id, ...args) {
  const file = id.startsWith('@backend/') ? path.join(root, 'backend/src', id.slice(9))
    : id.startsWith('@/') ? path.join(root, 'frontend/src', id.slice(2)) : id;
  return originalResolve.call(this, file, ...args);
};
require.extensions['.ts'] = function (module, filename) {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText, filename);
};
const { NextRequest } = require('next/server');
const { db } = require('../backend/src/config/database.ts');
const { crearToken } = require('../backend/src/utils/jwt.ts');
const all = ['Admin', 'Coordinador', 'Docente', 'Porteria'];
const teaching = ['Admin', 'Coordinador', 'Docente'];
const management = ['Admin', 'Coordinador'];
const routes = [
  ['usuarios', management, 'POST', management],
  ['estudiantes', all, 'POST', management],
  ['acudientes', management, 'POST', management],
  ['reportes', teaching, 'POST', teaching],
  ['convivencia', teaching, 'POST', teaching],
  ['alertas', teaching],
  ['notificaciones', management, 'POST', management],
  ['salidas', ['Admin', 'Coordinador', 'Porteria'], 'POST', ['Admin', 'Coordinador', 'Porteria']],
  ['eventos', all, 'POST', management],
  ['configuracion', management, 'PUT', management],
  ['auditoria', management],
  ['manual-convivencia', teaching],
  ['comunicaciones', teaching, 'POST', management],
  ['dashboard', all],
  ['dashboard/estadisticas', all],
  ['informes/exportar', management],
];
async function main() {
  let checks = 0;
  try {
    const migrationDir = path.join(root, 'database/prisma/migrations');
    for (const name of fs.readdirSync(migrationDir).sort()) {
      const migration = path.join(migrationDir, name, 'migration.sql');
      if (fs.existsSync(migration)) await db.executeMultiple(fs.readFileSync(migration, 'utf8'));
    }
    const tokens = {};
    const roleIds = { Coordinador: 1, Docente: 2, Porteria: 3, Admin: 4 };
    for (const rol of all) {
      const id = roleIds[rol];
      await db.execute({ sql: 'INSERT INTO Usuario(id,nombre,correo,contrasena,rol) VALUES(?,?,?,?,?)', args: [id, rol, `${id}@example.test`, 'unused', rol] });
      tokens[rol] = await crearToken({ id, rol, versionSesion: 1 });
    }
    for (const [route, readers, method, writers] of routes) {
      const handlers = require(path.join(root, 'frontend/src/app/api', route, 'route.ts'));
      for (const rol of [null, ...all]) {
        cookieToken = rol ? tokens[rol] : undefined;
        const request = new NextRequest(`http://localhost/api/${route}${route === 'acudientes' ? '?estudianteId=1' : ''}`);
        const response = await handlers.GET(request);
        assert.equal(response.status, !rol ? 401 : readers.includes(rol) ? 200 : 403, `GET ${route}: ${rol}`);
        checks++;
        if (method && (!rol || !writers.includes(rol))) {
          const denied = await handlers[method](new NextRequest(request.url, { method, body: '{}', headers: { 'Content-Type': 'application/json' } }));
          assert.equal(denied.status, !rol ? 401 : 403, `${method} ${route}: ${rol}`);
          checks++;
        }
      }
    }
    await db.execute("INSERT INTO Acudiente(id,nombre,contacto) VALUES(1,'Acudiente ficticio','Sin contacto')");
    await db.execute("INSERT INTO Estudiante(id,nombre,grado,grupo,acudienteId) VALUES(1,'Estudiante ficticio','11','1',1)");
    await db.execute("UPDATE GrupoEscolar SET directorId=2 WHERE grado='11' AND grupo='1'");
    await db.execute("INSERT INTO Reporte(id,estudianteId,docenteId,tipoFalta,descripcion,confidencial) VALUES(1,1,1,'TIPO_I','Reporte público de otro autor',0),(2,1,1,'TIPO_I','Reporte reservado',1),(3,1,2,'TIPO_I','Reporte propio',0)");
    const listReports = require('../frontend/src/app/api/reportes/route.ts');
    const detailReports = require('../frontend/src/app/api/reportes/[id]/route.ts');
    cookieToken = tokens.Docente;
    const own = await listReports.GET(new NextRequest('http://localhost/api/reportes'));
    assert.deepEqual((await own.json()).map(report => report.id).sort(), [1, 3]);
    const history = await listReports.GET(new NextRequest('http://localhost/api/reportes?estudianteId=1'));
    assert.deepEqual((await history.json()).map(report => report.id).sort(), [1, 3]);
    for (const [id, query, expected] of [[1, '', 200], [1, '?estudianteId=1', 200], [2, '?estudianteId=1', 404], [1, '?estudianteId=2', 404]]) {
      const response = await detailReports.GET(new NextRequest(`http://localhost/api/reportes/${id}${query}`), { params: Promise.resolve({ id: String(id) }) });
      assert.equal(response.status, expected);
      if (expected === 200) assert.ok(Object.values((await response.json()).permisos).every(value => value === false));
    }
    for (const invalid of ['0', '-1', 'abc', '1.5']) {
      assert.equal((await listReports.GET(new NextRequest(`http://localhost/api/reportes?estudianteId=${invalid}`))).status, 400);
    }
    cookieToken = tokens.Coordinador;
    assert.equal((await detailReports.GET(new NextRequest('http://localhost/api/reportes/2'), { params: Promise.resolve({ id: '2' }) })).status, 200);
    console.log('OK: reportes propios y del grupo dirigido, confidencialidad y parámetros inválidos en los controladores.');
    const exits = require('../frontend/src/app/api/salidas/route.ts');
    cookieToken = tokens.Porteria;
    const exitInput = { estudianteId: '1', recogeNombre: 'Persona', recogeApellido: 'Ficticia', recogeTipoDocumento: 'CC', recogeCedula: '123456', recogeParentesco: 'Madre', recogeCorreo: 'persona@example.test' };
    const postExit = (data) => exits.POST(new NextRequest('http://localhost/api/salidas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }));
    assert.equal((await postExit({ ...exitInput, recogeCedula: '12A456' })).status, 400);
    assert.equal((await postExit({ ...exitInput, recogeTipoDocumento: 'PASAPORTE' })).status, 400);
    assert.equal((await postExit({ ...exitInput, recogeParentesco: 'Vecino' })).status, 400);
    assert.equal((await postExit({ ...exitInput, recogeCorreo: 'incorrecto' })).status, 400);
    assert.equal((await postExit({ ...exitInput, estudianteId: '999' })).status, 404);
    const createdExit = await postExit(exitInput);
    assert.equal(createdExit.status, 201);
    const created = await createdExit.json();
    assert.equal(created.correoEnviado, false);
    assert.equal((await db.execute('SELECT COUNT(*) AS total FROM Salida')).rows[0].total, 1);
    await db.execute({ sql: 'DELETE FROM Salida WHERE id = ?', args: [created.id] });
    const fechaBogota = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const inicioDia = new Date(`${fechaBogota}T00:00:00-05:00`).getTime();
    const fechaSql = (value) => new Date(value).toISOString().replace('T', ' ').slice(0, 19);
    for (const [id, date] of [['before', fechaSql(inicioDia - 1)], ['start', fechaSql(inicioDia)], ['end', fechaSql(inicioDia + 86400000 - 1)], ['after', fechaSql(inicioDia + 86400000)]]) {
      await db.execute({ sql: "INSERT INTO Salida(id,estudianteId,acudienteId,motivo,registradoPorId,creadoEn) VALUES(?,1,1,'Prueba de fecha',3,?)", args: [id, date] });
    }
    assert.deepEqual((await (await exits.GET()).json()).map(exit => exit.id).sort(), ['end', 'start']);
    cookieToken = tokens.Coordinador;
    assert.equal((await (await exits.GET()).json()).length, 4);
    console.log('OK: registro de salidas, validación y límites de medianoche colombiana para Portería.');
    cookieToken = tokens.Docente;
    await db.execute('UPDATE Usuario SET activo=0 WHERE id=2');
    const reports = require('../frontend/src/app/api/reportes/route.ts');
    assert.equal((await reports.GET(new NextRequest('http://localhost/api/reportes'))).status, 401);
    console.log(`OK: ${checks} comprobaciones de lectura y escrituras denegadas en 16 rutas, más revocación de cuenta inactiva.`);
  } finally { db.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
