import { db } from '@backend/config/database';
import type { SesionUsuario } from '@backend/types/roles';

async function contar(sql: string) {
  const result = await db.execute(sql);
  return Number(result.rows[0]?.total || 0);
}

async function tablaExiste(nombre: string) {
  const result = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ? LIMIT 1",
    args: [nombre],
  });

  return result.rows.length > 0;
}

async function contarSiExiste(tabla: string, sql: string) {
  if (!(await tablaExiste(tabla))) return 0;
  return contar(sql);
}

async function consultar(sql: string) {
  const result = await db.execute(sql);
  return result.rows;
}

async function consultarConArgs(sql: string, args: Array<string | number>) {
  const result = await db.execute({ sql, args });
  return result.rows;
}

async function contarConArgs(sql: string, args: Array<string | number>) {
  const result = await db.execute({ sql, args });
  return Number(result.rows[0]?.total || 0);
}

function obtenerRangosSemanales(reference = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(reference);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((parte) => parte.type === tipo)?.value);
  const fechaBogota = new Date(Date.UTC(valor('year'), valor('month') - 1, valor('day')));
  const diasDesdeLunes = (fechaBogota.getUTCDay() + 6) % 7;
  const lunes = new Date(fechaBogota);
  lunes.setUTCDate(fechaBogota.getUTCDate() - diasDesdeLunes);
  const sabado = new Date(lunes);
  sabado.setUTCDate(lunes.getUTCDate() + 5);
  const lunesAnterior = new Date(lunes);
  lunesAnterior.setUTCDate(lunes.getUTCDate() - 7);
  const sabadoAnterior = new Date(sabado);
  sabadoAnterior.setUTCDate(sabado.getUTCDate() - 7);
  const instanteBogota = (fecha: Date) => new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(), 5)).toISOString();

  return {
    inicio: instanteBogota(lunes),
    fin: instanteBogota(sabado),
    inicioAnterior: instanteBogota(lunesAnterior),
    finAnterior: instanteBogota(sabadoAnterior),
  };
}

function obtenerRangosDiarios(reference = new Date()) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(reference);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) => Number(partes.find((parte) => parte.type === tipo)?.value);
  const hoy = new Date(Date.UTC(valor('year'), valor('month') - 1, valor('day')));
  const ayer = new Date(hoy);
  ayer.setUTCDate(hoy.getUTCDate() - 1);
  const manana = new Date(hoy);
  manana.setUTCDate(hoy.getUTCDate() + 1);
  const instanteBogota = (fecha: Date) => new Date(Date.UTC(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate(), 5)).toISOString();

  return { ayer: instanteBogota(ayer), hoy: instanteBogota(hoy), manana: instanteBogota(manana) };
}

async function obtenerResumenSemanal() {
  const rango = obtenerRangosSemanales();
  const [reportes, reportesAnteriores, grado, salidas] = await Promise.all([
    db.execute({ sql: 'SELECT COUNT(*) AS total FROM Reporte WHERE datetime(fecha) >= datetime(?) AND datetime(fecha) < datetime(?)', args: [rango.inicio, rango.fin] }),
    db.execute({ sql: 'SELECT COUNT(*) AS total FROM Reporte WHERE datetime(fecha) >= datetime(?) AND datetime(fecha) < datetime(?)', args: [rango.inicioAnterior, rango.finAnterior] }),
    db.execute({
      sql: `SELECT e.grado, e.grupo, COUNT(*) AS total
        FROM Reporte r INNER JOIN Estudiante e ON e.id = r.estudianteId
        WHERE datetime(r.fecha) >= datetime(?) AND datetime(r.fecha) < datetime(?)
        GROUP BY e.grado, e.grupo ORDER BY total DESC LIMIT 1`,
      args: [rango.inicio, rango.fin],
    }),
    db.execute({
      sql: `SELECT COUNT(*) AS total FROM Salida
        WHERE datetime(creadoEn) >= datetime(?) AND datetime(creadoEn) < datetime(?) AND estado IN ('autorizada', 'completada')`,
      args: [rango.inicio, rango.fin],
    }),
  ]);
  const gradoPrincipal = grado.rows[0];

  return {
    reportes: Number(reportes.rows[0]?.total || 0),
    reportesSemanaAnterior: Number(reportesAnteriores.rows[0]?.total || 0),
    gradoMayorActividad: gradoPrincipal ? `${gradoPrincipal.grado}${gradoPrincipal.grupo ? `°${gradoPrincipal.grupo}` : ''}` : null,
    registrosGrado: Number(gradoPrincipal?.total || 0),
    salidasAutorizadas: Number(salidas.rows[0]?.total || 0),
  };
}

async function obtenerGraficasSemanales() {
  const rango = obtenerRangosSemanales();
  const [reportesDiarios, reportesPorTipo, salidasSemanales] = await Promise.all([
    db.execute({
      sql: `SELECT CAST(strftime('%w', datetime(fecha, '-5 hours')) AS INTEGER) AS dia,
        tipoFalta AS tipo, COUNT(*) AS total
        FROM Reporte
        WHERE datetime(fecha) >= datetime(?) AND datetime(fecha) < datetime(?)
        GROUP BY dia, tipoFalta`,
      args: [rango.inicio, rango.fin],
    }),
    db.execute({
      sql: `SELECT tipoFalta AS tipo, COUNT(*) AS total
        FROM Reporte WHERE datetime(fecha) >= datetime(?) AND datetime(fecha) < datetime(?)
        GROUP BY tipoFalta ORDER BY total DESC`,
      args: [rango.inicio, rango.fin],
    }),
    db.execute({
      sql: 'SELECT COUNT(*) AS total FROM Salida WHERE datetime(creadoEn) >= datetime(?) AND datetime(creadoEn) < datetime(?)',
      args: [rango.inicio, rango.fin],
    }),
  ]);

  const reportesPorDiaYTipo = new Map(
    reportesDiarios.rows.map((row) => [
      `${Number(row.dia)}-${String(row.tipo)}`,
      Number(row.total || 0),
    ])
  );
  const dias = [
    { numero: 1, dia: 'Lun' },
    { numero: 2, dia: 'Mar' },
    { numero: 3, dia: 'Mié' },
    { numero: 4, dia: 'Jue' },
    { numero: 5, dia: 'Vie' },
  ];

  return {
    actividadSemanal: dias.map(({ numero, dia }) => ({
      dia,
      tipoI: reportesPorDiaYTipo.get(`${numero}-TIPO_I`) || 0,
      tipoII: reportesPorDiaYTipo.get(`${numero}-TIPO_II`) || 0,
      tipoIII: reportesPorDiaYTipo.get(`${numero}-TIPO_III`) || 0,
    })),
    reportesPorTipo: reportesPorTipo.rows,
    salidasSemanales: Number(salidasSemanales.rows[0]?.total || 0),
  };
}

async function obtenerTendenciasMensuales() {
  const [reportes, salidas] = await Promise.all([
    db.execute(`SELECT strftime('%Y-%m', fecha) AS mes, COUNT(*) AS total FROM Reporte WHERE datetime(fecha) >= datetime('now', '-5 months', 'start of month') GROUP BY mes`),
    db.execute(`SELECT strftime('%Y-%m', creadoEn) AS mes, COUNT(*) AS total FROM Salida WHERE datetime(creadoEn) >= datetime('now', '-5 months', 'start of month') GROUP BY mes`),
  ]);
  const reportesPorMes = new Map(reportes.rows.map((row) => [String(row.mes), Number(row.total || 0)]));
  const salidasPorMes = new Map(salidas.rows.map((row) => [String(row.mes), Number(row.total || 0)]));
  const hoy = new Date();

  return Array.from({ length: 6 }, (_, index) => {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth() - (5 - index), 1);
    const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
    return {
      mes: new Intl.DateTimeFormat('es-CO', { month: 'short' }).format(fecha).replace('.', ''),
      reportes: reportesPorMes.get(clave) || 0,
      salidas: salidasPorMes.get(clave) || 0,
    };
  });
}

export async function obtenerEstadisticasDashboard(usuario: SesionUsuario) {
  const rangoDia = obtenerRangosDiarios();
  const rangoSemana = obtenerRangosSemanales();
  const [
    usuarios,
    estudiantes,
    reportes,
    reportesPendientes,
    convivenciaAbierta,
    salidasPendientes,
    alertasActivas,
    notificacionesNoLeidas,
    notificaciones,
    salidasHoy,
    salidasAyer,
    eventosProximos,
    salidasPorEstado,
    ultimosReportes,
    ultimasSalidas,
    proximosEventos,
    alertasRecientes,
  ] = await Promise.all([
    contar('SELECT COUNT(*) AS total FROM Usuario WHERE activo = 1'),
    contar('SELECT COUNT(*) AS total FROM Estudiante WHERE archivado = 0 AND activo = 1'),
    contar('SELECT COUNT(*) AS total FROM Reporte'),
    contar("SELECT COUNT(*) AS total FROM Reporte WHERE estado = 'Pendiente'"),
    contarSiExiste('ConvivenciaReporte', "SELECT COUNT(*) AS total FROM ConvivenciaReporte WHERE estado = 'abierto'"),
    contar("SELECT COUNT(*) AS total FROM Salida WHERE estado = 'pendiente'"),
    contar("SELECT COUNT(*) AS total FROM Alerta WHERE estado <> 'resuelta'"),
    contarConArgs('SELECT COUNT(*) AS total FROM Notificacion WHERE leida = 0 AND datetime(enviadoEn) >= datetime(?) AND datetime(enviadoEn) < datetime(?)', [rangoSemana.inicio, rangoSemana.fin]),
    contarConArgs('SELECT COUNT(*) AS total FROM Notificacion WHERE datetime(enviadoEn) >= datetime(?) AND datetime(enviadoEn) < datetime(?)', [rangoSemana.inicio, rangoSemana.fin]),
    contarConArgs('SELECT COUNT(*) AS total FROM Salida WHERE datetime(creadoEn) >= datetime(?) AND datetime(creadoEn) < datetime(?)', [rangoDia.hoy, rangoDia.manana]),
    contarConArgs('SELECT COUNT(*) AS total FROM Salida WHERE datetime(creadoEn) >= datetime(?) AND datetime(creadoEn) < datetime(?)', [rangoDia.ayer, rangoDia.hoy]),
    contarConArgs('SELECT COUNT(*) AS total FROM Evento WHERE activo = 1 AND datetime(iniciaEn) >= datetime(?) AND datetime(iniciaEn) < datetime(?)', [rangoSemana.inicio, rangoSemana.fin]),
    consultar(`
      SELECT estado, COUNT(*) AS total
      FROM Salida
      GROUP BY estado
      ORDER BY total DESC
    `),
    consultarConArgs(`
      SELECT r.id, r.tipoFalta, r.descripcion, r.estado, r.fecha,
        e.nombre AS estudiante, e.grado, e.grupo, u.nombre AS docente
      FROM Reporte r
      INNER JOIN Estudiante e ON e.id = r.estudianteId
      INNER JOIN Usuario u ON u.id = r.docenteId
      WHERE r.confidencial = 0 OR ? = 'Coordinador' OR r.docenteId = ?
      ORDER BY r.fecha DESC
      LIMIT 6
    `, [usuario.rol, usuario.id]),
    consultar(`
      SELECT s.id, s.motivo, s.estado, s.urgencia, s.creadoEn,
        e.nombre AS estudiante, e.grado, a.nombre AS acudiente
      FROM Salida s
      INNER JOIN Estudiante e ON e.id = s.estudianteId
      INNER JOIN Acudiente a ON a.id = s.acudienteId
      ORDER BY s.creadoEn DESC
      LIMIT 5
    `),
    consultar(`
      SELECT id, titulo, iniciaEn
      FROM Evento
      WHERE activo = 1 AND datetime(iniciaEn) >= datetime('now')
      ORDER BY datetime(iniciaEn) ASC
      LIMIT 4
    `),
    consultar(`
      SELECT a.id, a.cantidadReportes, a.estado, a.notas, a.creadoEn,
        e.id AS estudianteId, e.nombre AS estudiante, e.grado, e.grupo
      FROM Alerta a
      INNER JOIN Estudiante e ON e.id = a.estudianteId
      WHERE a.estado <> 'resuelta'
      ORDER BY a.creadoEn DESC
      LIMIT 5
    `),
  ]);
  const [resumenSemanal, graficasSemanales, tendenciasMensuales] = await Promise.all([
    obtenerResumenSemanal(),
    obtenerGraficasSemanales(),
    obtenerTendenciasMensuales(),
  ]);

  const esPorteria = usuario.rol === 'Porteria';
  const resumenVisible = esPorteria ? {
    ...resumenSemanal,
    reportes: 0,
    reportesSemanaAnterior: 0,
    gradoMayorActividad: null,
    registrosGrado: 0,
  } : resumenSemanal;

  return {
    data: {
      usuario,
      metricas: {
        usuarios: usuario.rol === 'Coordinador' ? usuarios : 0,
        estudiantes,
        reportes: esPorteria ? 0 : reportes,
        reportesPendientes: esPorteria ? 0 : reportesPendientes,
        convivenciaAbierta: esPorteria ? 0 : convivenciaAbierta,
        salidasPendientes,
        alertasActivas: esPorteria ? 0 : alertasActivas,
        notificacionesNoLeidas: esPorteria ? 0 : notificacionesNoLeidas,
        notificaciones: esPorteria ? 0 : notificaciones,
        salidasHoy,
        salidasAyer,
        eventosProximos,
      },
      resumenSemanal: resumenVisible,
      graficas: {
        actividadSemanal: esPorteria ? [] : graficasSemanales.actividadSemanal,
        reportesPorTipo: esPorteria ? [] : graficasSemanales.reportesPorTipo,
        salidasSemanales: graficasSemanales.salidasSemanales,
        salidasPorEstado,
        tendenciasMensuales: esPorteria ? tendenciasMensuales.map((item) => ({ ...item, reportes: 0 })) : tendenciasMensuales,
      },
      tablas: {
        ultimosReportes: esPorteria ? [] : ultimosReportes,
        ultimasSalidas,
        proximosEventos,
        alertasRecientes: esPorteria ? [] : alertasRecientes,
      },
      accesos: obtenerAccesosPorRol(usuario.rol),
    },
  };
}

export async function obtenerResumenDashboard(usuario: SesionUsuario) {
  return obtenerEstadisticasDashboard(usuario);
}

function obtenerAccesosPorRol(rol: SesionUsuario['rol']) {
  if (rol === 'Coordinador') {
    return ['usuarios', 'estudiantes', 'reportes', 'alertas', 'convivencia', 'manual-convivencia', 'salidas', 'dashboard', 'auditoria', 'configuracion'];
  }
  if (rol === 'Docente') {
    return ['estudiantes', 'reportes', 'alertas', 'convivencia', 'manual-convivencia', 'dashboard'];
  }
  return ['salidas', 'dashboard'];
}
