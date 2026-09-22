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
const {validarObservador,datosReporteObservador}=helpers;
const yesterday=new Date(Date.now()-86400000).toISOString().slice(0,10);
const acta={fecha:yesterday,horaInicio:'08:00',horaFinal:'09:00',sede:'Sede principal',jornada:'Mañana',grupo:'11-1',acudiente:'Acudiente de prueba',cedulaAcudiente:'12345678',motivo:'Revisión de compromisos',tipoSituacion:'1',situacionAcademica:'',ordenDia:'Escucha de las partes y acuerdos.',desarrollo:'Se escucharon las partes y se acordó realizar seguimiento.',documentoReferencia:'Manual de Convivencia',referenciaNormativa:'Artículo 20, literal a'};
assert.ok(validarObservador(acta).data);
for(const change of [{referenciaNormativa:''},{fecha:'2026-02-30'},{ordenDia:''},{desarrollo:'Breve'},{tipoSituacion:'0',situacionAcademica:''}]) assert.equal(validarObservador({...acta,...change}).status,400);
assert.equal(datosReporteObservador(acta).fechaHecho,`${yesterday}T13:00:00.000Z`);
const db=createClient({url:pathToFileURL(join(mkdtempSync(join(tmpdir(),'sigde-observador-')),'test.db')).href});
globalThis.observadorTest={db,...helpers};
const {crearReporte,editarReporte,listarReportes,obtenerReporte}=await load('backend/src/services/reportes.service.ts',`const {db,validarObservador,datosReporteObservador}=globalThis.observadorTest;const registrarAccion=async()=>{};const notificarAcudientePorReporte=async()=>{};const evaluarAlertaEstudiante=async()=>{};\n`);
await db.batch([
'CREATE TABLE Usuario(id INTEGER PRIMARY KEY,nombre TEXT,rol TEXT)',
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
const actor={id:1,rol:'Docente',nombre:'Docente de prueba'};
const payload={estudianteId:1,tipoFalta:1,descripcion:'',fechaHecho:`${yesterday}T13:00:00.000Z`,observador:acta};
const esperado={...acta,fechaRegistro:payload.fechaHecho,horaFinal:'',sede:'Sin registrar',acudiente:'Acudiente vinculado',cedulaAcudiente:'87654321'};
const created=await crearReporte(payload,actor);assert.equal(created.status,201);assert.deepEqual(created.data.observador,esperado);
assert.deepEqual((await listarReportes(actor)).data[0].observador,esperado);
assert.deepEqual((await obtenerReporte(created.data.id,actor)).data.observador,esperado);
const edited=await editarReporte(created.data.id,actor,{observador:{...acta,ordenDia:'Orden corregido con compromisos.'}});assert.ok(edited.data);
assert.equal((await obtenerReporte(created.data.id,actor)).data.observador.ordenDia,'Orden corregido con compromisos.');
assert.equal((await obtenerReporte(created.data.id,actor)).data.observador.cedulaAcudiente,'87654321');
assert.equal((await obtenerReporte(created.data.id,actor)).data.observador.horaFinal,'');
assert.equal((await editarReporte(created.data.id,actor,{observador:{...acta,referenciaNormativa:''}})).status,400);
assert.equal((await crearReporte({...payload,observador:undefined},actor)).status,400);
const academic=await crearReporte({...payload,observador:{...acta,tipoSituacion:'0',situacionAcademica:'No entregó las actividades acordadas.',documentoReferencia:'SIEE'}},actor);
assert.equal(academic.data.tipoFalta,'ACADEMICA');
await db.execute("INSERT INTO Reporte(estudianteId,docenteId,tipoFalta,descripcion,confidencial) VALUES(1,1,'TIPO_I','Registro anterior',0)");
assert.equal((await listarReportes(actor)).data.find(r=>r.descripcion==='Registro anterior').observador,null);
await db.execute("UPDATE Acudiente SET nombre='Pendiente de registrar',documento=NULL WHERE id=1");
const sinDatos=await crearReporte(payload,actor);
assert.equal(sinDatos.status,201);assert.equal(sinDatos.data.observador.acudiente,'Sin registrar');assert.equal(sinDatos.data.observador.cedulaAcudiente,'Sin registrar');
console.log('OK: campos obligatorios, horas, fecha, CC, referencia, creación, consulta, edición, caso académico y compatibilidad de reportes anteriores.');db.close();
