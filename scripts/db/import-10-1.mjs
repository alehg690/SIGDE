import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
const raw = `Andres Felipe Ortiz Florez|andresfelipe.ortiz
Andres Juan Ochoa Giraldo|andresjuan.ochoa
Caleb Eduardo Campo Reina|caleb.camporeina
Danna Sofia Ortiz Corpus|dannasofia.ortiz
Deyvid Daniel Garcia|deyvid.garcia
Emmanuel Peña Quisoboni|emmanuel.pena
Isabela Gonzalez Cordoba|isabela.gonzalez
Jesus Alejandro Obando Arango|jesusalejandro.obando
Jesus David Salazar Caraballo|jesusdavid.salazar
Jose Alejandro Martinez Aguirre|josealejandro.martinez
Juan David Giraldo Cardenas|juan.giraldocardenas
Juan David Roa Gomez|juandavid.roa
Juan Esteban Calderon Lopez|juan.calderon
Juan Esteban Londoño Burbano|juanesteban.londono
Juan Esteban Sandoval Rengifo|juan.sandovalrengifo
Juan Esteban Balanta Ramos|juanesteban.balanta
Juan Miguel Lerma Galindo|juanmiguel.lerma
Julian Mazuera Moya|julian.mazueramoya
Kevin Alexander Parra Chaves|kevinalexander.parra
Laura Sofia Santofimio Toledo|laura.santofimiotoledo
Maria Jose Caicedo Perez|mariajose.caicedo
Maria Jose Muñoz Calvache|mariajose.munoz
Mariana Ospina Valencia|mariana.ospinavalencia
Matias Arce Salazar|matias.arce
Natalia Gutierrez Rodriguez|natalia.gutierrez
Oriana Leon Paredes|oriana.leon
Samuel Jimenez Giraldo|samuel.jimenez
Sara Camila Arias Mosquera|saracamila.arias
Sara Sophia Ortiz Estrada|sarasophia.ortiz
Samuel Alejandro Herrera Gomez|samuelalejandro.herrera
Samuel David Cortes Zapata|samueldavid.cortes
Valery Cruz Quiceno|valery.cruz`;
const students = raw.split('\n').map(line => {const [nombre,local]=line.split('|');return {nombre,correo:local+'@ietirafaelnaviavaron.edu.co'};});
if(students.length!==32 || new Set(students.map(s=>s.correo)).size!==32) throw Error('Lista inválida');
const email='alvaromacca.maestro@ietirafaelnaviavaron.edu.co';
// Solo consulta por defecto; --apply confirma la importación en una transacción.
const db=createClient({url:process.env.IMPORT_DATABASE_URL || process.env.TURSO_DATABASE_URL,authToken:process.env.IMPORT_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN});
try {
 const existing=(await db.execute('SELECT nombre,correo,grado,grupo FROM Estudiante')).rows;
 const matches=existing.filter(e=>students.some(s=>s.correo.toLowerCase()===String(e.correo).toLowerCase() || s.nombre.toLowerCase()===String(e.nombre).toLowerCase()));
 const director=(await db.execute({sql:'SELECT id,nombre,rol FROM Usuario WHERE lower(correo)=lower(?)',args:[email]})).rows;
 const group=(await db.execute("SELECT grado,grupo,jornada,directorId FROM GrupoEscolar WHERE grado='10' AND grupo='1'")).rows;
 console.log(JSON.stringify({estudiantesLista:students.length,coincidencias:matches,directorExistente:director,grupo:group}));
 if(!process.argv.includes('--apply')) process.exit(0);
 if(matches.length || director.length || group.some(g=>g.directorId!==null)) throw Error('Conflicto: revisar antes de importar');
 const password=randomBytes(24).toString('base64url');
 const statements=[{sql:"INSERT INTO Usuario(nombre,correo,contrasena,rol,activo) VALUES(?,?,?,'Docente',1)",args:['Alvaro Hernan Macca Otero',email,await bcrypt.hash(password,10)]},
 {sql:"INSERT INTO GrupoEscolar(grado,grupo,jornada,directorId) VALUES('10','1','Mañana',(SELECT id FROM Usuario WHERE correo=?)) ON CONFLICT(grado,grupo) DO UPDATE SET jornada=excluded.jornada,directorId=excluded.directorId,actualizadoEn=CURRENT_TIMESTAMP",args:[email]}];
 for(const s of students){
 const parts=s.nombre.split(' ');
 let first=parts[0],second=parts.slice(1,-2).join(' ')||null,last=parts.at(-2),last2=parts.at(-1);
 if(s.nombre==='Nombre pendiente' || s.correo.startsWith('deyvid.garcia@')) {first=null;second=null;last=null;last2=null;}
 statements.push({sql:"INSERT INTO Acudiente(nombre,contacto) VALUES('Pendiente de registrar','Pendiente de registrar')",args:[]});
 statements.push({sql:"INSERT INTO Estudiante(nombre,primerNombre,segundoNombre,primerApellido,segundoApellido,correo,grado,grupo,jornada,estado,activo,archivado,acudienteId) VALUES(?,?,?,?,?,?,'10','1','Mañana','Activo',1,0,last_insert_rowid())",args:[s.nombre,first,second,last,last2,s.correo]});
 }
 await db.batch(statements,'write');
 const saved=(await db.execute("SELECT nombre,correo,jornada,activo,archivado FROM Estudiante WHERE grado='10' AND grupo='1' ORDER BY nombre")).rows;
 if(saved.length!==32 || students.some(s=>!saved.some(r=>r.nombre===s.nombre && r.correo===s.correo && r.jornada==='Mañana' && Number(r.activo)===1 && Number(r.archivado)===0))) throw Error('Verificación fallida');
 console.log(JSON.stringify({verificado:saved.length,director:(await db.execute("SELECT u.nombre,u.correo,u.rol,g.grado,g.grupo,g.jornada FROM GrupoEscolar g JOIN Usuario u ON g.directorId=u.id WHERE g.grado='10' AND g.grupo='1'")).rows,grupos:(await db.execute('SELECT grado,grupo,COUNT(*) AS total FROM Estudiante WHERE archivado=0 GROUP BY grado,grupo')).rows}));
 console.log('Cuenta creada con contraseña aleatoria no divulgada; usar recuperación de contraseña para establecer acceso. No se enviaron correos.');
} finally {db.close();}
