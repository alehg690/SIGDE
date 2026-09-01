import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const DIRECTOR = {
  nombre: 'Mónica Larrahondo Prado',
  correo: 'monicalarrahondo.maestra@ietirafaelnaviavaron.edu.co',
  contrasenaTemporal: 'MonicaL1126',
};

const rawStudents = `
ABDEL SANTIAGO ROSERO OBANDO|abdel.rosero@ietirafaelnaviavaron.edu.co
ALEJANDRO HURTADO AGUDELO|alejandro.hurtado@ietirafaelnaviavaron.edu.co
ANA SOFIA GARCIA GUTIERREZ|anasofia.garcia.g@ietirafaelnaviavaron.edu.co
ANA SOFIA HOYOS JARAMILLO|anasofia.hoyos@ietirafaelnaviavaron.edu.co
ASHLY ALEJANDRA LOAIZA ARIAS|ashlyalejandra.loaiza@ietirafaelnaviavaron.edu.co
CAMILO RUIZ GORDON|camilo.ruiz@ietirafaelnaviavaron.edu.co
CARLOS DANIEL OVALLE POSSU|carlosdaniel.ovalle@ietirafaelnaviavaron.edu.co
CRISTIAN DAVID LOPEZ ARCE|cristian.lopez@ietirafaelnaviavaron.edu.co
DIEGO FERNANDO CAMARGO RUIZ|diegofernando.camargo@ietirafaelnaviavaron.edu.co
DILAN STEVAN QUIJANO TORO|dilanstevan.quijano@ietirafaelnaviavaron.edu.co
DAVID ALEXANDER CORREA ARROYO|davidalexander.correa@ietirafaelnaviavaron.edu.co
EMILY JULIETH GOMEZ LAGUADO|emily.gomez@ietirafaelnaviavaron.edu.co
ESTEBAN RODRIGUEZ CORTES|esteban.rodriguez@ietirafaelnaviavaron.edu.co
GABRIELA GONZALEZ VALENCIA|gabriela.gonzalez@ietirafaelnaviavaron.edu.co
ISABELLA GARCIA OSORIO|isabella.garcia@ietirafaelnaviavaron.edu.co
ISABELLA RIVERA SALDARIAGA|isabela.rivera@ietirafaelnaviavaron.edu.co
JHONATAN DAVID MARQUINEZ SEVILLANO|jhonatan.marquinez@ietirafaelnaviavaron.edu.co
JHONFRE MUÑOZ CORTES|jhonfre.munoz@ietirafaelnaviavaron.edu.co
JOSE ALEJANDRO FLOREZ ALVAREZ|josealejandro.florez@ietirafaelnaviavaron.edu.co
JOSE DANIEL PORTELA ROMERO|josedaniel.portela@ietirafaelnaviavaron.edu.co
JOSE LUIS BECERRA DIAZ|joseluis.becerra@ietirafaelnaviavaron.edu.co
JUAN CARLOS BRAND ROMAN|juancarlos.brand@ietirafaelnaviavaron.edu.co
JUAN STEVAN TRUJILLO SOLARTE|juanstevan.trujillo@ietirafaelnaviavaron.edu.co
JULIANA PATIÑO VASQUEZ|juliana.patino@ietirafaelnaviavaron.edu.co
KAROL VALENTINA ARBOLEDA TRUJILLO|valentina.arboleda@ietirafaelnaviavaron.edu.co
LEONARDO BUITRAGO GUEVARA|leonardo.buitrago@ietirafaelnaviavaron.edu.co
LIZZ SOPHIA CARDENAS ANTURI|lizzsophia.cardenas@ietirafaelnaviavaron.edu.co
LUZ ELENA MERCHANCANO BENITEZ|luzelena.merchancano@ietirafaelnaviavaron.edu.co
MARIA ALEJANDRA ARRAEZ QUIJANO|mariaalejandra.arraez@ietirafaelnaviavaron.edu.co
MARIA PAULA CAPURRO GOMEZ|mariapaula.capurro@ietirafaelnaviavaron.edu.co
MARIA VICTORIA TERAN CASADO|mariavictoria.teran@ietirafaelnaviavaron.edu.co
MARIANA BECERRA ARTEAGA|mariana.becerra@ietirafaelnaviavaron.edu.co
MARIANA OTALVARO MARIN|mariana.otalvaro@ietirafaelnaviavaron.edu.co
NATAN DAVID MUÑOZ SANCHEZ|natandavid.munoz@ietirafaelnaviavaron.edu.co
NICOLAS MOSQUERA BERNAL|nicolas.mosquera@ietirafaelnaviavaron.edu.co
NICOLE ANDREA DUQUE SALAZAR|nicoleandrea.duque@ietirafaelnaviavaron.edu.co
SAMUEL ALEJANDRO ECHEVERRY ESCOBAR|samuelalejandro.echeverry@ietirafaelnaviavaron.edu.co
SANTIAGO CUASQUER YOMAYUSA|santiago.cuasquer@ietirafaelnaviavaron.edu.co
SEBASTIAN PEÑA TABORDA|sebastian.pena@ietirafaelnaviavaron.edu.co
`;

const students = rawStudents.trim().split('\n').map((line) => {
  const [nombre, correo] = line.trim().split('|');
  return { nombre: titleCase(nombre), correo: correo.toLowerCase() };
});

function titleCase(value) {
  return value.toLocaleLowerCase('es-CO').replace(/(^|\s)(\p{L})/gu, (_, space, letter) => `${space}${letter.toLocaleUpperCase('es-CO')}`);
}

function splitName(nombre) {
  const parts = nombre.split(/\s+/);
  if (parts.length >= 4) return { primerNombre: parts[0], segundoNombre: parts.slice(1, -2).join(' '), primerApellido: parts.at(-2), segundoApellido: parts.at(-1) };
  return { primerNombre: parts[0], segundoNombre: null, primerApellido: parts.at(-2), segundoApellido: parts.at(-1) };
}

const db = createClient({
  url: process.env.IMPORT_DATABASE_URL || process.env.TURSO_DATABASE_URL,
  authToken: process.env.IMPORT_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN || undefined,
});

async function importar() {
  const hash = await bcrypt.hash(DIRECTOR.contrasenaTemporal, 10);
  const directorResult = await db.execute({
    sql: `INSERT INTO Usuario (nombre, correo, contrasena, rol, activo)
      VALUES (?, ?, ?, 'Docente', 1)
      ON CONFLICT(correo) DO UPDATE SET nombre = excluded.nombre, rol = 'Docente', activo = 1
      RETURNING id`,
    args: [DIRECTOR.nombre, DIRECTOR.correo, hash],
  });
  const directorId = Number(directorResult.rows[0].id);

  await db.execute({
    sql: `INSERT INTO GrupoEscolar (grado, grupo, jornada, directorId)
      VALUES ('11', '2', 'Mañana', ?)
      ON CONFLICT(grado, grupo) DO UPDATE SET jornada = 'Mañana', directorId = excluded.directorId, actualizadoEn = CURRENT_TIMESTAMP`,
    args: [directorId],
  });

  let creados = 0;
  let actualizados = 0;
  for (const student of students) {
    const identity = splitName(student.nombre);
    const current = await db.execute({ sql: 'SELECT id FROM Estudiante WHERE correo = ? LIMIT 1', args: [student.correo] });
    if (current.rows[0]) {
      await db.execute({
        sql: `UPDATE Estudiante SET nombre = ?, primerNombre = ?, segundoNombre = ?, primerApellido = ?, segundoApellido = ?,
          grado = '11', grupo = '2', jornada = 'Mañana', estado = 'Activo', activo = 1, archivado = 0, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?`,
        args: [student.nombre, identity.primerNombre, identity.segundoNombre, identity.primerApellido, identity.segundoApellido, Number(current.rows[0].id)],
      });
      actualizados += 1;
      continue;
    }

    const guardian = await db.execute({
      sql: `INSERT INTO Acudiente (nombre, contacto) VALUES ('Pendiente de registrar', 'Pendiente de registrar') RETURNING id`,
      args: [],
    });
    await db.execute({
      sql: `INSERT INTO Estudiante
        (nombre, primerNombre, segundoNombre, primerApellido, segundoApellido, correo, grado, grupo, jornada, estado, activo, archivado, acudienteId)
        VALUES (?, ?, ?, ?, ?, ?, '11', '2', 'Mañana', 'Activo', 1, 0, ?)`,
      args: [student.nombre, identity.primerNombre, identity.segundoNombre, identity.primerApellido, identity.segundoApellido, student.correo, Number(guardian.rows[0].id)],
    });
    creados += 1;
  }

  const count = await db.execute("SELECT COUNT(*) AS total FROM Estudiante WHERE grado = '11' AND grupo = '2' AND archivado = 0");
  console.log(`11-2 importado: ${Number(count.rows[0].total)} estudiantes (${creados} creados, ${actualizados} actualizados).`);
  console.log(`Directora: ${DIRECTOR.nombre} <${DIRECTOR.correo}>`);
  console.log(`Contraseña temporal: ${DIRECTOR.contrasenaTemporal}`);
}

try {
  await importar();
} finally {
  db.close();
}
