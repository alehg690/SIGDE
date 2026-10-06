import {createClient} from '@libsql/client';
import ts from 'typescript';
import {readFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
Error.stackTraceLimit=0;
async function load(file,prefix=''){
 const source=prefix+readFileSync(file,'utf8').replace(/^import .*;[\r\n]*/gm,'');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
 return import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
}
const helpers=await load('backend/src/services/observador.service.ts');
const uploads=await load('backend/src/utils/uploads.ts');
const {validarObservador,datosReporteObservador}=helpers;
const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
const acta={fecha:yesterday,horaInicio:'08:00',horaFinal:'09:00',sede:'Sede principal',jornada:'Mañana',grupo:'11-1',acudiente:'Acudiente de prueba',cedulaAcudiente:'12345678',motivo:'Revisión de compromisos',tipoSituacion:'1',situacionAcademica:'',ordenDia:'Escucha de las partes y acuerdos.',desarrollo:'Se escucharon las partes y se acordó realizar seguimiento.',documentoReferencia:'Manual de Convivencia',referenciaNormativa:'Artículo 20, literal a'};
assert.ok(validarObservador(acta).data);
for(const change of [{documentoReferencia:'Documento inválido'},{fecha:'2026-02-30'},{ordenDia:''},{desarrollo:'Breve'},{tipoSituacion:'0',situacionAcademica:''}]) assert.equal(validarObservador({...acta,...change}).status,400);
assert.equal(validarObservador({...acta,documentoReferencia:'',referenciaNormativa:''}).data.referenciaNormativa,'');
assert.equal(datosReporteObservador(acta).fechaHecho,`${yesterday}T13:00:00.000Z`);
const db=createClient({url:pathToFileURL(join(mkdtempSync(join(tmpdir(),'sigde-observador-')),'test.db')).href});
globalThis.observadorTest={db,...helpers,...uploads};
const {crearReporte,editarReporte,listarReportes,obtenerReporte,agregarObservacionReporte,agregarEvidenciaReporte,agregarArchivoEvidencia,obtenerArchivoEvidencia}=await load('backend/src/services/reportes.service.ts',`const {db,validarObservador,datosReporteObservador,contenidoBinario,firmaArchivoValida,nombreArchivoSeguro}=globalThis.observadorTest;const registrarAccion=async()=>{};const notificarAcudientePorReporte=async()=>{};const evaluarAlertaEstudiante=async()=>{};const esRolCoordinador=(rol)=>rol==='Coordinador';\n`);
await db.batch([
'CREATE TABLE Usuario(id INTEGER PRIMARY KEY,nombre TEXT,rol TEXT)',
'CREATE TABLE GrupoEscolar(id INTEGER PRIMARY KEY,grado TEXT,grupo TEXT,directorId INTEGER)',
'CREATE TABLE Estudiante(id INTEGER PRIMARY KEY,nombre TEXT,grado TEXT,grupo TEXT,activo INTEGER,archivado INTEGER,jornada TEXT,acudienteId INTEGER)',
`CREATE TABLE Reporte(id INTEGER PRIMARY KEY AUTOINCREMENT,estudianteId INTEGER,docenteId INTEGER,tipoFalta TEXT,fechaHecho TEXT,lugar TEXT,situacion TEXT,descripcion TEXT,actuacionInicial TEXT,confidencial INTEGER,evidenciaUrl TEXT,editableHasta TEXT,observaciones TEXT,fecha TEXT DEFAULT CURRENT_TIMESTAMP,estado TEXT DEFAULT 'Pendiente',creadoEn TEXT DEFAULT CURRENT_TIMESTAMP,actualizadoEn TEXT DEFAULT CURRENT_TIMESTAMP)`,
'CREATE TABLE EvidenciaReporte(id INTEGER PRIMARY KEY,reporteId INTEGER,nombre TEXT,tipo TEXT,url TEXT,creadoEn TEXT)',
'CREATE TABLE ObservacionReporte(id INTEGER PRIMARY KEY,reporteId INTEGER,usuarioId INTEGER,texto TEXT,creadoEn TEXT)',
'CREATE TABLE Acudiente(id INTEGER PRIMARY KEY,nombre TEXT,documento TEXT)',
'CREATE TABLE ConfiguracionSistema(clave TEXT,valor TEXT)',
'CREATE TABLE Notificacion(id INTEGER PRIMARY KEY,reporteId INTEGER,acudienteId INTEGER,canal TEXT,asunto TEXT,leida INTEGER,enviadoEn TEXT)',
'CREATE TABLE NotificacionUsuario(id INTEGER PRIMARY KEY,reporteId INTEGER,usuarioId INTEGER,canal TEXT,asunto TEXT,leida INTEGER,enviadoEn TEXT)',
"INSERT INTO Usuario VALUES(1,'Docente de prueba','Docente')",
"INSERT INTO Estudiante VALUES(1,'Estudiante de prueba','11','1',1,0,'Mañana',1)",
"INSERT INTO Acudiente VALUES(1,'Acudiente vinculado','87654321')"
],'write');
await db.execute(readFileSync('database/prisma/migrations/20260922020000_observador_reuniones/migration.sql','utf8'));
for(const sql of readFileSync('database/prisma/migrations/20260929020000_archivos_evidencia/migration.sql','utf8').split(';').map(item=>item.trim()).filter(Boolean)) await db.execute(sql);
const actor={id:1,rol:'Docente',nombre:'Docente de prueba'};
const payload={estudianteId:1,tipoFalta:1,descripcion:'',fechaHecho:`${yesterday}T13:00:00.000Z`,observador:acta};
const esperado={...acta,fechaRegistro:payload.fechaHecho,horaFinal:'',sede:'Sin registrar',acudiente:'Acudiente vinculado',cedulaAcudiente:'87654321'};
const created=await crearReporte(payload,actor);assert.equal(created.status,201);assert.deepEqual(created.data.observador,esperado);
const bytes=new Uint8Array([37,80,68,70,45,49,46,55]);
const attached=await agregarArchivoEvidencia(created.data.id,{nombre:'evidencia.pdf',mimeType:'application/pdf',contenido:bytes},actor);
assert.equal(attached.status,201);
assert.deepEqual((await obtenerArchivoEvidencia(created.data.id,attached.data.id,actor)).data.contenido,bytes);
assert.deepEqual((await listarReportes(actor)).data[0].observador,esperado);
assert.deepEqual((await obtenerReporte(created.data.id,actor)).data.observador,esperado);
const edited=await editarReporte(created.data.id,actor,{observador:{...acta,ordenDia:'Orden corregido con compromisos.'}});assert.ok(edited.data);
assert.equal((await obtenerReporte(created.data.id,actor)).data.observador.ordenDia,'Orden corregido con compromisos.');
assert.equal((await obtenerReporte(created.data.id,actor)).data.observador.cedulaAcudiente,'87654321');
assert.equal((await obtenerReporte(created.data.id,actor)).data.observador.horaFinal,'');
assert.ok((await editarReporte(created.data.id,actor,{observador:{...acta,referenciaNormativa:''}})).data);
const withoutReference=await crearReporte({...payload,observador:{...acta,documentoReferencia:undefined,referenciaNormativa:undefined}},actor);
assert.equal(withoutReference.status,201);
assert.equal(withoutReference.data.observador.documentoReferencia,'');
assert.equal(withoutReference.data.observador.referenciaNormativa,'');
assert.equal((await crearReporte({...payload,observador:undefined},actor)).status,400);
const academic=await crearReporte({...payload,observador:{...acta,tipoSituacion:'0',situacionAcademica:'No entregó las actividades acordadas.',documentoReferencia:'SIEE'}},actor);
assert.equal(academic.data.tipoFalta,'ACADEMICA');
await db.execute("INSERT INTO Reporte(estudianteId,docenteId,tipoFalta,descripcion,confidencial) VALUES(1,1,'TIPO_I','Registro anterior',0)");
assert.equal((await listarReportes(actor)).data.find(r=>r.descripcion==='Registro anterior').observador,null);
await db.execute("UPDATE Acudiente SET nombre='Pendiente de registrar',documento=NULL WHERE id=1");
const sinDatos=await crearReporte(payload,actor);
assert.equal(sinDatos.status,201);assert.equal(sinDatos.data.observador.acudiente,'Sin registrar');assert.equal(sinDatos.data.observador.cedulaAcudiente,'Sin registrar');
// Exercise ownership and student-history access against an isolated database.
await db.batch([
  "INSERT INTO Usuario VALUES(2,'Otro docente','Docente')",
  "INSERT INTO Usuario VALUES(3,'Coordinación','Coordinador')",
  "INSERT INTO Estudiante VALUES(2,'Otro estudiante','11','2',1,0,'Mañana',1)"
], 'write');
const other = { ...actor, id: 2, nombre: 'Otro docente' };
const coordinator = { ...actor, id: 3, rol: 'Coordinador' };
await db.execute("INSERT INTO GrupoEscolar VALUES(1,'11','1',1)");
assert.equal((await obtenerArchivoEvidencia(created.data.id,attached.data.id,other)).status,404);
assert.deepEqual((await obtenerArchivoEvidencia(created.data.id,attached.data.id,coordinator)).data.contenido,bytes);
const publicReport = await crearReporte(payload, other);
const privateReport = await crearReporte({ ...payload, confidencial: true }, other);
const anotherStudent = await crearReporte({ ...payload, estudianteId: 2 }, other);
assert.equal(publicReport.status, 201);
assert.equal(privateReport.status, 201);
assert.equal(anotherStudent.status, 201);
const visiblesDirector = (await listarReportes(actor)).data;
assert.ok(visiblesDirector.some(report => report.id === publicReport.data.id));
assert.ok(!visiblesDirector.some(report => report.id === privateReport.data.id));
assert.ok(!visiblesDirector.some(report => report.id === anotherStudent.data.id));
const history = (await listarReportes(actor, 1)).data;
assert.ok(history.some(report => report.id === publicReport.data.id && report.docente === 'Otro docente'));
assert.ok(!history.some(report => report.id === privateReport.data.id));
assert.ok(!history.some(report => report.id === anotherStudent.data.id));
assert.ok((await obtenerReporte(publicReport.data.id, actor)).data);
assert.equal((await obtenerReporte(publicReport.data.id, actor, 2)).status, 404);
assert.equal((await obtenerReporte(privateReport.data.id, actor, 1)).status, 404);
await db.execute({ sql: "INSERT INTO ObservacionReporte(reporteId,usuarioId,texto) VALUES(?,2,'Seguimiento de prueba')", args: [publicReport.data.id] });
await db.execute({ sql: "INSERT INTO EvidenciaReporte(reporteId,nombre,tipo,url) VALUES(?,'Acta','Documento','https://example.com/acta')", args: [publicReport.data.id] });
await db.execute({ sql: "INSERT INTO Notificacion(reporteId,acudienteId,canal,asunto) VALUES(?,1,'app','Reporte registrado')", args: [publicReport.data.id] });
const detail = (await obtenerReporte(publicReport.data.id, actor, 1)).data;
assert.ok(detail.observador);
assert.equal(detail.docente, 'Otro docente');
assert.equal(detail.observacionesLista.length, 1);
assert.equal(detail.evidencias.length, 1);
assert.equal(detail.notificaciones.length, 1);
assert.ok(Object.values(detail.permisos).every(permission => permission === false));
assert.equal((await editarReporte(publicReport.data.id, actor, { observador: acta })).status, 403);
assert.equal((await agregarObservacionReporte(publicReport.data.id, 'Intento de cambio', actor)).status, 403);
assert.equal((await agregarEvidenciaReporte(publicReport.data.id, { nombre: 'Acta', tipo: 'Documento', url: 'https://example.com/acta' }, actor)).status, 403);
assert.ok((await listarReportes(other, 1)).data.some(report => report.id === privateReport.data.id));
assert.ok((await listarReportes(coordinator)).data.some(report => report.id === privateReport.data.id));
assert.ok((await obtenerReporte(privateReport.data.id, coordinator, 1)).data);
console.log('OK: autoría, historial por estudiante, confidencialidad, detalle completo y restricciones de edición.');
console.log('OK: campos obligatorios, horas, fecha, CC, referencia, creación, consulta, edición, caso académico y compatibilidad de reportes anteriores.');db.close();
