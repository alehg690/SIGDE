import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
const raw = `Amelit Jose Rondon Brito|amelitjose.rondon
Andres Fabian Prado Rios|andresfabian.prado
Briana Alejandra Torres Cardona|brianaalejandra.torres
Camilo Andres Uribe Quintero|camiloandres.uribe
Diego Andrés Arellano Ruíz|diegoandres.arellano
Dylan Mateo Valencia Lenis|dylan.valencia
Diego Andres Escobar Moreno|diegoandres.escobar
Gabriela Joaqui Parra|gabriela.joaqui
Jean Paul Chaves Hernandez|jeanpaul.chaves
Jennifer Camila Gonzalez Angulo|jennifer.gonzalez
Jhoan David Salinas Estrada|jhoandavid.salinas
Jose David Bedoya Naranjo|josedavid.bedoya
Josue Galindo Delgado|josue.galindo
Juan Camilo Buitrago Leal|juancamilo.buitrago
Juan Felipe Rodriguez Naranjo|juan.rodriguez
Juan Jose Andrade Bedoya|juan.andrade
Juan Jose Angulo Caniqui|juan.angulo
Juan Pablo Bedoya Martinez|juanpablo.bedoya
Juan Pablo Molina Castaño|juanpablo.molina
Juan Sebastian Mateus Bolaños|juan.mateus
Laura Sofia Del Castillo Garcia|laurasofia.delcastillo
Laura Sofia Duran Aria|laura.duran
Laura Sophia Leon Garcia|laurasophia.leon
Maria De Los Angeles Arboleda Rincon|mariadelosangeles.arboleda
Maria Jose Cordoba Perdomo|maria.cordoba
Mariana Realpe Rincon|mariana.realpe
Marlon Samuel Rojas Rojas|marlonsamuel.rojas
Miguel Angel Ceballos Solano|miguel.ceballos
Miguel Angel Gallego Trujillo|miguelangel.gallego
Samuel Esteban Velasquez Galan|samuelesteban.velasquez
Santiago Barón Medina|santiago.baron
Santiago Buitrago Villa|santiago.buitrago
Santiago Pineda Tapias|santiago.pineda
Sara Nicol Perez Mayorga|saranicol.perez
Sara Sofia Cuenu Henao|sarasofia.cuenu
Sara Sofia Guerrero Zapata|sarasofia.guerrero
Sebastian Ricardo Rodriguez Sepulveda|sebastian.rodriguez
Sofia Chamorro Gil|sofia.chamorro
Valery Marino Antia|valery.marino
Valery Julieth Torres Zamora|valery.torres
Zaraith Sofia Echeverri Perez|zaraithsofia.echeverri`;
const students = raw.split('\n').map(line => {const [nombre,local]=line.split('|');return {nombre,correo:local+'@ietirafaelnaviavaron.edu.co'};});
if(students.length!==41 || new Set(students.map(s=>s.correo)).size!==41) throw Error('Lista inválida');
const email='olgamasso.maestra@ietirafaelnaviavaron.edu.co';
// Solo consulta por defecto; --apply confirma la importación en una transacción.
const db=createClient({url:process.env.IMPORT_DATABASE_URL || process.env.TURSO_DATABASE_URL,authToken:process.env.IMPORT_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN});
try {
 const existing=(await db.execute('SELECT nombre,correo,grado,grupo FROM Estudiante')).rows;
 const matches=existing.filter(e=>students.some(s=>s.correo.toLowerCase()===String(e.correo).toLowerCase() || s.nombre.toLowerCase()===String(e.nombre).toLowerCase()));
 const director=(await db.execute({sql:'SELECT id,nombre,rol FROM Usuario WHERE lower(correo)=lower(?)',args:[email]})).rows;
 const group=(await db.execute("SELECT grado,grupo,jornada,directorId FROM GrupoEscolar WHERE grado='11' AND grupo='1'")).rows;
 console.log(JSON.stringify({estudiantesLista:students.length,coincidencias:matches,directorExistente:director,grupo:group}));
 if(!process.argv.includes('--apply')) process.exit(0);
 if(matches.length || director.length || group.some(g=>g.directorId!==null)) throw Error('Conflicto: revisar antes de importar');
 const password=randomBytes(24).toString('base64url');
 const statements=[{sql:"INSERT INTO Usuario(nombre,correo,contrasena,rol,activo) VALUES(?,?,?,'Docente',1)",args:['Olga Lucia Masso',email,await bcrypt.hash(password,10)]},
 {sql:"INSERT INTO GrupoEscolar(grado,grupo,jornada,directorId) VALUES('11','1','Mañana',(SELECT id FROM Usuario WHERE correo=?)) ON CONFLICT(grado,grupo) DO UPDATE SET jornada=excluded.jornada,directorId=excluded.directorId,actualizadoEn=CURRENT_TIMESTAMP",args:[email]}];
 for(const s of students){
 const parts=s.nombre.split(' ');
 let first=parts[0],second=parts.slice(1,-2).join(' ')||null,last=parts.at(-2),last2=parts.at(-1);
 if(s.correo.startsWith('laurasofia.delcastillo@')) {second='Sofia';last='Del Castillo';}
 statements.push({sql:"INSERT INTO Acudiente(nombre,contacto) VALUES('Pendiente de registrar','Pendiente de registrar')",args:[]});
 statements.push({sql:"INSERT INTO Estudiante(nombre,primerNombre,segundoNombre,primerApellido,segundoApellido,correo,grado,grupo,jornada,estado,activo,archivado,acudienteId) VALUES(?,?,?,?,?,?,'11','1','Mañana','Activo',1,0,last_insert_rowid())",args:[s.nombre,first,second,last,last2,s.correo]});
 }
 await db.batch(statements,'write');
 const saved=(await db.execute("SELECT nombre,correo,jornada,activo,archivado FROM Estudiante WHERE grado='11' AND grupo='1' ORDER BY nombre")).rows;
 if(saved.length!==41 || students.some(s=>!saved.some(r=>r.nombre===s.nombre && r.correo===s.correo && r.jornada==='Mañana' && Number(r.activo)===1 && Number(r.archivado)===0))) throw Error('Verificación fallida');
 console.log(JSON.stringify({verificado:saved.length,directora:(await db.execute("SELECT u.nombre,u.correo,u.rol,g.grado,g.grupo,g.jornada FROM GrupoEscolar g JOIN Usuario u ON g.directorId=u.id WHERE g.grado='11' AND g.grupo='1'")).rows,grupos:(await db.execute('SELECT grado,grupo,COUNT(*) AS total FROM Estudiante WHERE archivado=0 GROUP BY grado,grupo')).rows}));
 console.log('Cuenta creada con contraseña aleatoria no divulgada; usar recuperación de contraseña para establecer acceso. No se enviaron correos.');
} finally {db.close();}
