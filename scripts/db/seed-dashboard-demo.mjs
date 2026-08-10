import bcrypt from 'bcryptjs';
import { createClient } from '@libsql/client';

const DEMO_PREFIX = 'DEMO-';
const DEMO_EMAILS = [
  'demo.coordinacion@sigde.local',
  'demo.docente@sigde.local',
  'demo.porteria@sigde.local',
];

const usuariosDemo = [
  { nombre: 'Coordinación Demo', correo: DEMO_EMAILS[0], rol: 'Coordinador' },
  { nombre: 'Laura Méndez Demo', correo: DEMO_EMAILS[1], rol: 'Docente' },
  { nombre: 'Portería Demo', correo: DEMO_EMAILS[2], rol: 'Porteria' },
];

const personasDemo = [
  { estudiante: 'Juan David Martínez', documento: 'DEMO-EST-001', grado: '11', grupo: 'A', acudiente: 'Claudia Martínez', acudienteDocumento: 'DEMO-AC-001', telefono: '3001000001' },
  { estudiante: 'Valentina Gómez', documento: 'DEMO-EST-002', grado: '10', grupo: 'B', acudiente: 'Andrés Gómez', acudienteDocumento: 'DEMO-AC-002', telefono: '3001000002' },
  { estudiante: 'Mateo Rodríguez', documento: 'DEMO-EST-003', grado: '8', grupo: 'C', acudiente: 'Marta Rodríguez', acudienteDocumento: 'DEMO-AC-003', telefono: '3001000003' },
  { estudiante: 'Sara López', documento: 'DEMO-EST-004', grado: '9', grupo: 'A', acudiente: 'Diana López', acudienteDocumento: 'DEMO-AC-004', telefono: '3001000004' },
  { estudiante: 'Samuel Torres', documento: 'DEMO-EST-005', grado: '7', grupo: 'B', acudiente: 'Carlos Torres', acudienteDocumento: 'DEMO-AC-005', telefono: '3001000005' },
  { estudiante: 'Isabella Ramírez', documento: 'DEMO-EST-006', grado: '11', grupo: 'A', acudiente: 'Paola Ramírez', acudienteDocumento: 'DEMO-AC-006', telefono: '3001000006' },
  { estudiante: 'Nicolás Herrera', documento: 'DEMO-EST-007', grado: '6', grupo: 'A', acudiente: 'Jorge Herrera', acudienteDocumento: 'DEMO-AC-007', telefono: '3001000007' },
  { estudiante: 'Mariana Castro', documento: 'DEMO-EST-008', grado: '10', grupo: 'A', acudiente: 'Liliana Castro', acudienteDocumento: 'DEMO-AC-008', telefono: '3001000008' },
];

const descripciones = [
  'Interrupciones reiteradas durante la actividad de clase. Se realizó orientación pedagógica y el estudiante retomó el trabajo.',
  'Discusión verbal durante el cambio de clase. El docente intervino de inmediato y se acordó una conversación restaurativa.',
  'Incumplimiento de un acuerdo de aula previamente establecido. Se registró el compromiso de mejora correspondiente.',
  'Uso inadecuado de un dispositivo móvil durante una evaluación. El elemento fue entregado según el protocolo institucional.',
  'Conflicto entre compañeros en un espacio común. No hubo lesiones y se activó acompañamiento de convivencia.',
  'Llegada tardía reiterada sin justificación. Se dialogó con el estudiante y se informó al acudiente.',
];

const salidasDemo = [
  { estudiante: 0, motivo: 'Cita médica programada', tipo: 'ordinaria', estado: 'autorizada', urgencia: 0, dia: 0 },
  { estudiante: 1, motivo: 'Control odontológico', tipo: 'ordinaria', estado: 'completada', urgencia: 0, dia: 1 },
  { estudiante: 2, motivo: 'Malestar general', tipo: 'urgente', estado: 'completada', urgencia: 1, dia: 2 },
  { estudiante: 3, motivo: 'Trámite familiar', tipo: 'ordinaria', estado: 'autorizada', urgencia: 0, dia: 3 },
  { estudiante: 4, motivo: 'Cita de control', tipo: 'ordinaria', estado: 'pendiente', urgencia: 0, dia: 4 },
  { estudiante: 5, motivo: 'Actividad deportiva externa', tipo: 'ordinaria', estado: 'autorizada', urgencia: 0, dia: 4 },
];

const dbUrl = process.env.TURSO_DATABASE_URL;
if (!dbUrl) throw new Error('Falta TURSO_DATABASE_URL en el entorno.');

const db = createClient({ url: dbUrl, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

function fechaBogotaBase(reference = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(reference);
  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
}

function lunesSemana(reference = new Date()) {
  const today = fechaBogotaBase(reference);
  const daysSinceSaturday = (today.getUTCDay() + 1) % 7;
  const saturday = new Date(today);
  saturday.setUTCDate(today.getUTCDate() - daysSinceSaturday);
  const monday = new Date(saturday);
  monday.setUTCDate(saturday.getUTCDate() - 5);
  return monday;
}

function atDay(base, offset, hour = 14, minute = 0) {
  const date = new Date(base);
  date.setUTCDate(base.getUTCDate() + offset);
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

function atMonth(offset, day = 15, hour = 15) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, day, hour)).toISOString();
}

async function requiredTablesExist() {
  const required = ['Usuario', 'Acudiente', 'Estudiante', 'Reporte', 'Alerta', 'Salida', 'Notificacion', 'AuditLog', 'Evento'];
  const result = await db.execute("SELECT name FROM sqlite_master WHERE type = 'table'");
  const existing = new Set(result.rows.map((row) => String(row.name)));
  const missing = required.filter((table) => !existing.has(table));
  if (missing.length) throw new Error(`Faltan tablas requeridas: ${missing.join(', ')}. Ejecuta primero las migraciones.`);
}

async function limpiarDatosDemo({ removeUsers = false } = {}) {
  const studentQuery = "SELECT id FROM Estudiante WHERE documento LIKE 'DEMO-EST-%'";
  const guardianQuery = "SELECT id FROM Acudiente WHERE documento LIKE 'DEMO-AC-%'";
  const reportQuery = `SELECT id FROM Reporte WHERE estudianteId IN (${studentQuery})`;
  const userPlaceholders = DEMO_EMAILS.map(() => '?').join(', ');

  await db.execute(`DELETE FROM Notificacion WHERE reporteId IN (${reportQuery}) OR acudienteId IN (${guardianQuery})`);
  await db.execute(`DELETE FROM ObservacionReporte WHERE reporteId IN (${reportQuery})`);
  await db.execute(`DELETE FROM EvidenciaReporte WHERE reporteId IN (${reportQuery})`);
  await db.execute(`DELETE FROM Alerta WHERE estudianteId IN (${studentQuery})`);
  await db.execute("DELETE FROM Salida WHERE id LIKE 'DEMO-SALIDA-%' OR estudianteId IN (SELECT id FROM Estudiante WHERE documento LIKE 'DEMO-EST-%')");
  await db.execute(`DELETE FROM Reporte WHERE estudianteId IN (${studentQuery})`);
  await db.execute(`DELETE FROM Estudiante WHERE documento LIKE '${DEMO_PREFIX}EST-%'`);
  await db.execute(`DELETE FROM Acudiente WHERE documento LIKE '${DEMO_PREFIX}AC-%'`);
  await db.execute("DELETE FROM Evento WHERE titulo LIKE '[DEMO] %'");
  await db.execute({ sql: `DELETE FROM AuditLog WHERE usuarioId IN (SELECT id FROM Usuario WHERE correo IN (${userPlaceholders}))`, args: DEMO_EMAILS });
  if (removeUsers) await db.execute({ sql: `DELETE FROM Usuario WHERE correo IN (${userPlaceholders})`, args: DEMO_EMAILS });
}

async function upsertUsuario(usuario, passwordHash) {
  const result = await db.execute({
    sql: `INSERT INTO Usuario (nombre, correo, contrasena, rol, activo)
      VALUES (?, ?, ?, ?, 1)
      ON CONFLICT(correo) DO UPDATE SET nombre = excluded.nombre, contrasena = excluded.contrasena,
        rol = excluded.rol, activo = 1
      RETURNING id`,
    args: [usuario.nombre, usuario.correo, passwordHash, usuario.rol],
  });
  return Number(result.rows[0].id);
}

async function insertarId(sql, args) {
  const result = await db.execute({ sql: `${sql} RETURNING id`, args });
  return Number(result.rows[0].id);
}

async function sembrar() {
  await limpiarDatosDemo();
  const passwordHash = await bcrypt.hash('Demo2026', 10);
  const userIds = [];
  for (const usuario of usuariosDemo) userIds.push(await upsertUsuario(usuario, passwordHash));

  const guardians = [];
  const students = [];
  for (const person of personasDemo) {
    const guardianId = await insertarId(
      'INSERT INTO Acudiente (nombre, contacto, correo, telefono, documento) VALUES (?, ?, ?, ?, ?)',
      [person.acudiente, person.telefono, null, person.telefono, person.acudienteDocumento]
    );
    const studentId = await insertarId(
      "INSERT INTO Estudiante (nombre, documento, grado, grupo, estado, activo, archivado, acudienteId) VALUES (?, ?, ?, ?, 'Activo', 1, 0, ?)",
      [person.estudiante, person.documento, person.grado, person.grupo, guardianId]
    );
    guardians.push(guardianId);
    students.push(studentId);
  }

  const monday = lunesSemana();
  const reportIds = [];
  const weeklyDays = [0, 0, 1, 1, 1, 2, 2, 3, 3, 3, 4, 4];
  const weeklyTypes = ['TIPO_I', 'TIPO_II', 'TIPO_I', 'TIPO_III', 'TIPO_I', 'TIPO_II', 'TIPO_I', 'TIPO_II', 'TIPO_I', 'TIPO_III', 'TIPO_I', 'TIPO_II'];
  for (let index = 0; index < weeklyDays.length; index += 1) {
    const fecha = atDay(monday, weeklyDays[index], 13 + (index % 4), (index * 7) % 60);
    const estado = index % 4 === 0 ? 'EnRevision' : index % 5 === 0 ? 'Cerrado' : 'Pendiente';
    const reportId = await insertarId(
      `INSERT INTO Reporte (estudianteId, docenteId, tipoFalta, descripcion, observaciones, fecha, estado, confidencial, editableHasta, creadoEn, actualizadoEn)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [students[index % students.length], userIds[1], weeklyTypes[index], descripciones[index % descripciones.length], estado === 'Pendiente' ? null : 'Caso revisado por el equipo de convivencia.', fecha, estado, index % 6 === 0 ? 1 : 0, atDay(monday, weeklyDays[index] + 1), fecha, fecha]
    );
    reportIds.push(reportId);
  }

  for (let index = 0; index < 5; index += 1) {
    const fecha = atDay(monday, -7 + index, 14 + (index % 3));
    await insertarId(
      'INSERT INTO Reporte (estudianteId, docenteId, tipoFalta, descripcion, fecha, estado, confidencial, creadoEn, actualizadoEn) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
      [students[(index + 2) % students.length], userIds[1], weeklyTypes[index], descripciones[(index + 1) % descripciones.length], fecha, index % 2 ? 'Cerrado' : 'Pendiente', fecha, fecha]
    );
  }

  const monthlyCounts = [6, 7, 4, 5, 3];
  for (let monthOffset = 1; monthOffset <= monthlyCounts.length; monthOffset += 1) {
    for (let index = 0; index < monthlyCounts[monthOffset - 1]; index += 1) {
      const fecha = atMonth(monthOffset, 8 + index, 13 + (index % 4));
      await insertarId(
        'INSERT INTO Reporte (estudianteId, docenteId, tipoFalta, descripcion, fecha, estado, confidencial, creadoEn, actualizadoEn) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)',
        [students[index % students.length], userIds[1], weeklyTypes[(index + monthOffset) % weeklyTypes.length], descripciones[index % descripciones.length], fecha, index % 3 === 0 ? 'Cerrado' : 'Pendiente', fecha, fecha]
      );
    }
  }

  for (let index = 0; index < salidasDemo.length; index += 1) {
    const item = salidasDemo[index];
    const fecha = atDay(monday, item.dia, 15 + (index % 3));
    await db.execute({
      sql: `INSERT INTO Salida (id, estudianteId, acudienteId, motivo, tipo, urgencia, estado,
        firmaDirector, firmaDocente, firmaCoordinacion, firmaAcudiente, registradoPorId, creadoEn, actualizadoEn)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, 1, ?, ?, ?, ?)`,
      args: [`DEMO-SALIDA-${String(index + 1).padStart(3, '0')}`, students[item.estudiante], guardians[item.estudiante], item.motivo, item.tipo, item.urgencia, item.estado, item.estado === 'completada' ? 1 : 0, userIds[2], fecha, fecha],
    });
  }

  const today = fechaBogotaBase();
  for (let index = 0; index < 2; index += 1) {
    const fecha = atDay(today, 0, 13 + index);
    await db.execute({
      sql: `INSERT INTO Salida (id, estudianteId, acudienteId, motivo, tipo, urgencia, estado,
        firmaDirector, firmaDocente, firmaCoordinacion, firmaAcudiente, registradoPorId, creadoEn, actualizadoEn)
        VALUES (?, ?, ?, ?, 'ordinaria', 0, 'pendiente', 0, 0, 0, 0, ?, ?, ?)`,
      args: [`DEMO-SALIDA-HOY-${index + 1}`, students[index + 6], guardians[index + 6], 'Autorización pendiente para diligencia familiar', userIds[2], fecha, fecha],
    });
  }

  for (let monthOffset = 1; monthOffset <= 5; monthOffset += 1) {
    for (let index = 0; index < monthOffset + 1; index += 1) {
      const fecha = atMonth(monthOffset, 10 + index);
      await db.execute({
        sql: `INSERT INTO Salida (id, estudianteId, acudienteId, motivo, tipo, urgencia, estado,
          firmaDirector, firmaDocente, firmaCoordinacion, firmaAcudiente, registradoPorId, creadoEn, actualizadoEn)
          VALUES (?, ?, ?, 'Cita programada', 'ordinaria', 0, 'completada', 1, 1, 1, 1, ?, ?, ?)`,
        args: [`DEMO-SALIDA-M${monthOffset}-${index + 1}`, students[index % students.length], guardians[index % guardians.length], userIds[2], fecha, fecha],
      });
    }
  }

  const alerts = [
    { student: 0, count: 4, state: 'activa', note: 'Requiere revisión del director de grupo.' },
    { student: 2, count: 3, state: 'en_seguimiento', note: 'Acudiente citado para seguimiento.' },
    { student: 5, count: 5, state: 'activa', note: 'Se recomienda plan de acompañamiento.' },
  ];
  for (let index = 0; index < alerts.length; index += 1) {
    const item = alerts[index];
    const fecha = atDay(monday, index + 1, 16);
    await db.execute({ sql: 'INSERT INTO Alerta (estudianteId, cantidadReportes, estado, notas, creadoEn, actualizadoEn) VALUES (?, ?, ?, ?, ?, ?)', args: [students[item.student], item.count, item.state, item.note, fecha, fecha] });
  }

  for (let index = 0; index < 6; index += 1) {
    const reporteId = reportIds[index];
    const personIndex = index % personasDemo.length;
    await db.execute({
      sql: 'INSERT INTO Notificacion (acudienteId, reporteId, canal, asunto, mensaje, leida, enviadoEn) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [guardians[personIndex], reporteId, 'app', `Seguimiento de convivencia - ${personasDemo[personIndex].estudiante}`, 'Se registró una novedad de convivencia. Consulta el detalle en SIGDE.', index > 3 ? 1 : 0, atDay(monday, index % 5, 18)],
    });
  }

  const events = [
    { title: '[DEMO] Comité de convivencia', day: 2, location: 'Sala de reuniones' },
    { title: '[DEMO] Escuela de familias', day: 4, location: 'Auditorio' },
    { title: '[DEMO] Reunión de área', day: null, future: 1, location: 'Sala de docentes' },
    { title: '[DEMO] Entrega de boletines', day: null, future: 2, location: 'Aulas por grado' },
    { title: '[DEMO] Citación de acudientes', day: null, future: 3, location: 'Coordinación' },
    { title: '[DEMO] Jornada pedagógica', day: null, future: 5, location: 'Auditorio' },
  ];
  for (const event of events) {
    const starts = event.day === null ? atDay(today, event.future, 14) : atDay(monday, event.day, 15);
    await db.execute({ sql: 'INSERT INTO Evento (titulo, descripcion, ubicacion, iniciaEn, activo, creadoEn, actualizadoEn) VALUES (?, ?, ?, ?, 1, ?, ?)', args: [event.title, 'Actividad institucional de demostración.', event.location, starts, new Date().toISOString(), new Date().toISOString()] });
  }

  const auditActions = ['crear_reporte', 'consultar_estudiante', 'autorizar_salida', 'actualizar_reporte', 'crear_evento'];
  for (let index = 0; index < auditActions.length; index += 1) {
    await db.execute({
      sql: 'INSERT INTO AuditLog (usuarioId, accion, entidad, entidadId, detalle, creadoEn) VALUES (?, ?, ?, ?, ?, ?)',
      args: [userIds[index % userIds.length], auditActions[index], 'DemoDashboard', String(index + 1), JSON.stringify({ demo: true }), atDay(monday, index, 17)],
    });
  }

  const counts = await Promise.all([
    db.execute({ sql: `SELECT COUNT(*) AS total FROM Usuario WHERE correo IN (${DEMO_EMAILS.map(() => '?').join(', ')})`, args: DEMO_EMAILS }),
    db.execute("SELECT COUNT(*) AS total FROM Estudiante WHERE documento LIKE 'DEMO-EST-%'"),
    db.execute("SELECT COUNT(*) AS total FROM Reporte WHERE estudianteId IN (SELECT id FROM Estudiante WHERE documento LIKE 'DEMO-EST-%')"),
    db.execute("SELECT COUNT(*) AS total FROM Salida WHERE id LIKE 'DEMO-SALIDA-%'"),
    db.execute("SELECT COUNT(*) AS total FROM Alerta WHERE estudianteId IN (SELECT id FROM Estudiante WHERE documento LIKE 'DEMO-EST-%')"),
    db.execute("SELECT COUNT(*) AS total FROM Evento WHERE titulo LIKE '[DEMO] %'"),
  ]);
  const total = (index) => Number(counts[index].rows[0]?.total || 0);

  console.log('Datos de demostración creados correctamente.');
  console.log(`Usuarios: ${total(0)} | Estudiantes: ${total(1)} | Reportes: ${total(2)} | Salidas: ${total(3)} | Alertas: ${total(4)} | Eventos: ${total(5)}`);
  console.log('Acceso coordinador: demo.coordinacion@sigde.local / Demo2026');
}

try {
  await requiredTablesExist();
  if (process.argv.includes('--clean')) {
    await limpiarDatosDemo({ removeUsers: true });
    console.log('Datos de demostración eliminados correctamente.');
  } else {
    await sembrar();
  }
} finally {
  db.close();
}
