import { createClient } from '@libsql/client';

const DEMO_MARKER = '[DEMO DASHBOARD]';

// Solo contiene reportes ficticios. Los estudiantes y el docente se toman de
// registros activos existentes para no poblar otros módulos con datos falsos.
const reportesDemo = [
  { estudiante: 0, dia: 0, tipo: 'TIPO_I', estado: 'Pendiente', hora: 8, minuto: 10 },
  { estudiante: 0, dia: 0, tipo: 'TIPO_II', estado: 'EnRevision', hora: 10, minuto: 25 },
  { estudiante: 1, dia: 0, tipo: 'TIPO_I', estado: 'Pendiente', hora: 12, minuto: 5 },
  { estudiante: 0, dia: 1, tipo: 'TIPO_I', estado: 'Pendiente', hora: 7, minuto: 45 },
  { estudiante: 1, dia: 1, tipo: 'TIPO_III', estado: 'EnRevision', hora: 9, minuto: 20 },
  { estudiante: 2, dia: 1, tipo: 'TIPO_II', estado: 'Pendiente', hora: 11, minuto: 40 },
  { estudiante: 1, dia: 2, tipo: 'TIPO_I', estado: 'Pendiente', hora: 8, minuto: 35 },
  { estudiante: 2, dia: 2, tipo: 'TIPO_II', estado: 'Cerrado', hora: 10, minuto: 15 },
  { estudiante: 3, dia: 3, tipo: 'TIPO_I', estado: 'Pendiente', hora: 7, minuto: 55 },
  { estudiante: 3, dia: 3, tipo: 'TIPO_III', estado: 'EnRevision', hora: 9, minuto: 50 },
  { estudiante: 4, dia: 4, tipo: 'TIPO_I', estado: 'Pendiente', hora: 8, minuto: 25 },
  { estudiante: 4, dia: 4, tipo: 'TIPO_II', estado: 'Cerrado', hora: 11, minuto: 5 },
];

const reportesSemanaAnterior = [
  { estudiante: 0, dia: 0, tipo: 'TIPO_I', estado: 'Cerrado', hora: 8, minuto: 20 },
  { estudiante: 1, dia: 1, tipo: 'TIPO_II', estado: 'Cerrado', hora: 9, minuto: 10 },
  { estudiante: 2, dia: 2, tipo: 'TIPO_I', estado: 'Cerrado', hora: 10, minuto: 30 },
  { estudiante: 3, dia: 3, tipo: 'TIPO_II', estado: 'EnRevision', hora: 8, minuto: 40 },
  { estudiante: 4, dia: 4, tipo: 'TIPO_I', estado: 'Pendiente', hora: 11, minuto: 15 },
];

const descripciones = [
  'Registro ficticio para comprobar la actividad reciente; no corresponde a un hecho real.',
  'Dato de demostración para validar las métricas semanales; no corresponde a un hecho real.',
  'Caso simulado para revisar la distribución por tipo; no corresponde a un hecho real.',
  'Reporte temporal para probar el panel de convivencia; no corresponde a un hecho real.',
];

const dbUrl = process.env.TURSO_DATABASE_URL;
if (!dbUrl) throw new Error('Falta TURSO_DATABASE_URL en el entorno.');

const db = createClient({
  url: dbUrl,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

function fechaBogota(reference = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(reference);
  const value = (type) => Number(parts.find((part) => part.type === type)?.value);
  return new Date(Date.UTC(value('year'), value('month') - 1, value('day')));
}

function lunesActual(reference = new Date()) {
  const today = fechaBogota(reference);
  const daysSinceMonday = (today.getUTCDay() + 6) % 7;
  const monday = new Date(today);
  monday.setUTCDate(today.getUTCDate() - daysSinceMonday);
  return monday;
}

function diaEscolarActual(reference = new Date()) {
  const day = (fechaBogota(reference).getUTCDay() + 6) % 7;
  return Math.min(4, Math.max(0, day));
}

function atDay(base, offset, hour, minute) {
  const date = new Date(base);
  date.setUTCDate(base.getUTCDate() + offset);
  // 12:00 UTC equivale a 07:00 en Bogotá. Se conserva una hora escolar visible.
  date.setUTCHours(hour + 5, minute, 0, 0);
  return date.toISOString();
}

async function verificarEstructura() {
  const requiredTables = ['Usuario', 'Estudiante', 'Reporte', 'Alerta'];
  const tables = await db.execute({
    sql: 'SELECT name FROM sqlite_master WHERE type = ?',
    args: ['table'],
  });
  const existing = new Set(tables.rows.map((row) => String(row.name)));
  const missing = requiredTables.filter((name) => !existing.has(name));
  if (missing.length) {
    throw new Error(`Faltan tablas requeridas: ${missing.join(', ')}.`);
  }

  const columns = await db.execute('PRAGMA table_info(Reporte)');
  const existingColumns = new Set(columns.rows.map((row) => String(row.name)));
  const requiredColumns = ['fechaHecho', 'lugar', 'situacion', 'actuacionInicial', 'editableHasta'];
  const missingColumns = requiredColumns.filter((name) => !existingColumns.has(name));
  if (missingColumns.length) {
    throw new Error(`Faltan columnas de Reporte: ${missingColumns.join(', ')}. Ejecuta npm run migrate:reportes.`);
  }
}

async function obtenerRelacionesExistentes() {
  const [docentes, estudiantes] = await Promise.all([
    db.execute({
      sql: `SELECT id, nombre FROM Usuario
        WHERE activo = 1 AND rol = ?
        ORDER BY CASE WHEN LOWER(nombre) LIKE ? THEN 0 ELSE 1 END, id
        LIMIT 1`,
      args: ['Docente', '%demo%'],
    }),
    db.execute(`SELECT id, nombre FROM Estudiante
      WHERE activo = 1 AND archivado = 0
      ORDER BY id
      LIMIT 5`),
  ]);

  if (!docentes.rows[0]) throw new Error('No hay un docente activo para asociar los reportes.');
  if (estudiantes.rows.length < 5) throw new Error('Se requieren al menos cinco estudiantes activos para el demo.');

  return {
    docente: docentes.rows[0],
    estudiantes: estudiantes.rows,
  };
}

async function idsReportesDemo() {
  const result = await db.execute({
    sql: 'SELECT id FROM Reporte WHERE situacion = ? OR descripcion LIKE ?',
    args: [DEMO_MARKER, `${DEMO_MARKER}%`],
  });
  return result.rows.map((row) => Number(row.id));
}

async function limpiarDatosDemo() {
  const reportIds = await idsReportesDemo();

  await db.execute({
    sql: 'DELETE FROM Alerta WHERE notas LIKE ?',
    args: [`${DEMO_MARKER}%`],
  });

  if (reportIds.length) {
    const placeholders = reportIds.map(() => '?').join(', ');
    for (const table of ['NotificacionUsuario', 'Notificacion', 'ObservacionReporte', 'EvidenciaReporte']) {
      await db.execute({
        sql: `DELETE FROM ${table} WHERE reporteId IN (${placeholders})`,
        args: reportIds,
      });
    }
    await db.execute({
      sql: `DELETE FROM Reporte WHERE id IN (${placeholders})`,
      args: reportIds,
    });
  }

  return reportIds.length;
}

async function insertarReporte(item, weekOffset, index, context) {
  const monday = new Date(context.monday);
  monday.setUTCDate(monday.getUTCDate() + weekOffset * 7);
  const visibleDay = weekOffset === 0 ? Math.min(item.dia, context.currentSchoolDay) : item.dia;
  const date = atDay(monday, visibleDay, item.hora, item.minuto);
  const description = `${DEMO_MARKER} ${descripciones[index % descripciones.length]}`;

  await db.execute({
    sql: `INSERT INTO Reporte (
      estudianteId, docenteId, tipoFalta, fechaHecho, lugar, situacion,
      descripcion, actuacionInicial, observaciones, fecha, estado,
      confidencial, editableHasta, creadoEn, actualizadoEn
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
    args: [
      Number(context.estudiantes[item.estudiante].id),
      Number(context.docente.id),
      item.tipo,
      date,
      'Aula de demostración',
      DEMO_MARKER,
      description,
      'Validación visual del dashboard; no requiere actuación institucional.',
      'Dato temporal y ficticio.',
      date,
      item.estado,
      atDay(monday, visibleDay + 1, item.hora, item.minuto),
      date,
      date,
    ],
  });
}

async function sincronizarAlertasDerivadas(estudiantes) {
  const configuration = await db.execute({
    sql: 'SELECT clave, valor FROM ConfiguracionSistema WHERE clave IN (?, ?)',
    args: ['alertas.umbralReportes', 'alertas.periodoDias'],
  });
  const values = new Map(configuration.rows.map((row) => [String(row.clave), Number(row.valor)]));
  const threshold = values.get('alertas.umbralReportes') || 3;
  const periodDays = values.get('alertas.periodoDias') || 30;
  let created = 0;

  for (const student of estudiantes) {
    const countResult = await db.execute({
      sql: `SELECT COUNT(*) AS total FROM Reporte
        WHERE estudianteId = ? AND estado <> ? AND datetime(creadoEn) >= datetime('now', ?)`,
      args: [Number(student.id), 'Anulado', `-${periodDays} days`],
    });
    const total = Number(countResult.rows[0]?.total || 0);
    if (total < threshold) continue;

    const active = await db.execute({
      sql: 'SELECT id FROM Alerta WHERE estudianteId = ? AND estado <> ? LIMIT 1',
      args: [Number(student.id), 'resuelta'],
    });
    if (active.rows[0]) continue;

    await db.execute({
      sql: `INSERT INTO Alerta (estudianteId, cantidadReportes, estado, notas)
        VALUES (?, ?, ?, ?)`,
      args: [
        Number(student.id),
        total,
        'activa',
        `${DEMO_MARKER} Umbral de prueba: ${total} reportes en ${periodDays} días.`,
      ],
    });
    created += 1;
  }

  return created;
}

async function sembrar() {
  await limpiarDatosDemo();
  const relations = await obtenerRelacionesExistentes();
  const context = {
    ...relations,
    monday: lunesActual(),
    currentSchoolDay: diaEscolarActual(),
  };

  for (let index = 0; index < reportesDemo.length; index += 1) {
    await insertarReporte(reportesDemo[index], 0, index, context);
  }
  for (let index = 0; index < reportesSemanaAnterior.length; index += 1) {
    await insertarReporte(reportesSemanaAnterior[index], -1, index + reportesDemo.length, context);
  }

  const alerts = await sincronizarAlertasDerivadas(relations.estudiantes);
  const types = await db.execute({
    sql: `SELECT tipoFalta, COUNT(*) AS total FROM Reporte
      WHERE situacion = ? GROUP BY tipoFalta ORDER BY tipoFalta`,
    args: [DEMO_MARKER],
  });

  console.log('Datos ficticios del dashboard creados correctamente.');
  console.log(`Reportes: ${reportesDemo.length + reportesSemanaAnterior.length} (${reportesDemo.length} de la semana actual).`);
  console.log(`Alertas derivadas por umbral: ${alerts}.`);
  console.log(`Distribución: ${types.rows.map((row) => `${row.tipoFalta}=${row.total}`).join(', ')}.`);
  console.log(`Docente asociado: ${relations.docente.nombre}.`);
  console.log('Todos los reportes están marcados como DEMO y declaran que no corresponden a hechos reales.');
}

try {
  await verificarEstructura();
  if (process.argv.includes('--clean')) {
    const deleted = await limpiarDatosDemo();
    console.log(`Datos de demostración eliminados: ${deleted} reportes y sus alertas derivadas.`);
  } else {
    await sembrar();
  }
} finally {
  db.close();
}
