import {createClient} from '@libsql/client';
import ts from 'typescript';
import {readFileSync, mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const directory=mkdtempSync(join(tmpdir(),'sigde-user-deletion-'));
const db=createClient({url:pathToFileURL(join(directory,'test.db')).href});
globalThis.testDb=db;
let source=readFileSync('backend/src/services/usuarios.service.ts','utf8').replace(/^import .*;[\r\n]*/gm,'');
source='const db = globalThis.testDb;\n'+source;
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {eliminarUsuario}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
await db.execute('PRAGMA foreign_keys=ON');
await db.batch([
'CREATE TABLE Usuario(id INTEGER PRIMARY KEY,nombre TEXT,correo TEXT,rol TEXT)',
'CREATE TABLE AuditLog(id INTEGER PRIMARY KEY AUTOINCREMENT,usuarioId INTEGER NOT NULL REFERENCES Usuario(id),accion TEXT NOT NULL,entidad TEXT NOT NULL,entidadId TEXT,detalle TEXT,creadoEn TEXT DEFAULT CURRENT_TIMESTAMP)',
'CREATE TABLE Reporte(id INTEGER PRIMARY KEY,docenteId INTEGER REFERENCES Usuario(id))',
'CREATE TABLE NotificacionUsuario(id INTEGER PRIMARY KEY,usuarioId INTEGER REFERENCES Usuario(id))',
'CREATE TABLE GrupoEscolar(id INTEGER PRIMARY KEY,directorId INTEGER REFERENCES Usuario(id),actualizadoEn TEXT)',
"INSERT INTO Usuario VALUES(1,'Actor','a@test.co','Coordinador'),(2,'Conservar','b@test.co','Docente'),(3,'Borrar','c@test.co','Docente'),(4,'Con reporte','d@test.co','Docente'),(5,'Rollback','e@test.co','Docente')",
"INSERT INTO AuditLog(usuarioId,accion,entidad) VALUES(2,'login','Usuario'),(3,'login','Usuario'),(4,'login','Usuario'),(5,'login','Usuario')",
'INSERT INTO Reporte VALUES(1,4)', 'INSERT INTO GrupoEscolar VALUES(1,2,NULL)', 'INSERT INTO NotificacionUsuario VALUES(1,2)'
],'write');
const migration=readFileSync('database/prisma/migrations/20260922000000_auditoria_usuario_eliminado/migration.sql','utf8');
await db.batch(migration.split(';').map(s=>s.trim()).filter(Boolean),'write');
assert.equal((await db.execute('SELECT COUNT(*) n FROM AuditLog')).rows[0].n,4);
await db.batch([
  'ALTER TABLE Usuario ADD COLUMN eliminadoEn TEXT',
  'ALTER TABLE Usuario ADD COLUMN activo INTEGER DEFAULT 1',
  'ALTER TABLE Usuario ADD COLUMN versionSesion INTEGER DEFAULT 1',
  'ALTER TABLE Usuario ADD COLUMN contrasena TEXT',
  'ALTER TABLE Usuario ADD COLUMN tokenRecuperacion TEXT',
  'ALTER TABLE Usuario ADD COLUMN tokenExpira TEXT'
], 'write');
const actor={id:1,rol:'Coordinador'};
assert.ok((await eliminarUsuario(2,actor,false)).data);
assert.equal((await db.execute('SELECT usuarioId FROM AuditLog WHERE id=1')).rows[0].usuarioId,null);
assert.equal((await db.execute('SELECT usuarioNombre FROM AuditLog WHERE id=1')).rows[0].usuarioNombre,'Conservar');
assert.equal((await db.execute('SELECT directorId FROM GrupoEscolar WHERE id=1')).rows[0].directorId,null);
assert.equal((await db.execute('SELECT COUNT(*) n FROM NotificacionUsuario')).rows[0].n,0);
assert.ok((await eliminarUsuario(3,actor,true)).data);
assert.equal((await db.execute('SELECT COUNT(*) n FROM AuditLog WHERE id=2')).rows[0].n,0);
assert.ok((await eliminarUsuario(4,actor,true)).data);
assert.equal((await db.execute('SELECT COUNT(*) n FROM Reporte WHERE docenteId=4')).rows[0].n,1);
const deleted=(await db.execute('SELECT * FROM Usuario WHERE id=4')).rows[0];
assert.ok(deleted.eliminadoEn);
assert.equal(deleted.activo,0);
assert.equal(deleted.versionSesion,2);
assert.equal(deleted.contrasena,'');
assert.notEqual(deleted.correo,'d@test.co');
assert.equal((await eliminarUsuario(4,actor,true)).status,404);
assert.equal((await db.execute('SELECT COUNT(*) n FROM AuditLog WHERE usuarioId=4')).rows[0].n,0);
assert.equal((await eliminarUsuario(1,actor,true)).status,400);
assert.equal((await eliminarUsuario(999,actor,false)).status,404);
await assert.rejects(eliminarUsuario(5,{id:999,rol:'Coordinador'},true));
assert.equal((await db.execute('SELECT COUNT(*) n FROM Usuario WHERE id=5')).rows[0].n,1);
assert.equal((await db.execute('SELECT COUNT(*) n FROM AuditLog WHERE usuarioId=5')).rows[0].n,1);
assert.equal((await db.execute('PRAGMA foreign_key_check')).rows.length,0);
console.log('OK: migración, conservar, borrar, grupos, notificaciones, eliminación con reportes conservados, cuenta propia, inexistente y rollback.');
db.close();
// Windows puede mantener abierto el archivo SQLite hasta que finalice Node.
