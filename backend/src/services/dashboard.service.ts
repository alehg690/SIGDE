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

export async function obtenerEstadisticasDashboard(usuario: SesionUsuario) {
  const [
    usuarios,
    estudiantes,
    reportes,
    reportesPendientes,
    convivenciaAbierta,
    salidasPendientes,
    alertasActivas,
    notificacionesNoLeidas,
    reportesPorTipo,
    salidasPorEstado,
    ultimosReportes,
    ultimasSalidas,
  ] = await Promise.all([
    contar('SELECT COUNT(*) AS total FROM Usuario WHERE activo = 1'),
    contar('SELECT COUNT(*) AS total FROM Estudiante WHERE archivado = 0'),
    contar('SELECT COUNT(*) AS total FROM Reporte'),
    contar("SELECT COUNT(*) AS total FROM Reporte WHERE estado = 'Pendiente'"),
    contarSiExiste('ConvivenciaReporte', "SELECT COUNT(*) AS total FROM ConvivenciaReporte WHERE estado = 'abierto'"),
    contar("SELECT COUNT(*) AS total FROM Salida WHERE estado = 'pendiente'"),
    contar("SELECT COUNT(*) AS total FROM Alerta WHERE estado <> 'resuelta'"),
    contar('SELECT COUNT(*) AS total FROM Notificacion WHERE leida = 0'),
    consultar(`
      SELECT tipoFalta AS tipo, COUNT(*) AS total
      FROM Reporte
      GROUP BY tipoFalta
      ORDER BY total DESC
    `),
    consultar(`
      SELECT estado, COUNT(*) AS total
      FROM Salida
      GROUP BY estado
      ORDER BY total DESC
    `),
    consultar(`
      SELECT r.id, r.tipoFalta, r.descripcion, r.estado, r.fecha,
        e.nombre AS estudiante, e.grado, e.grupo, u.nombre AS docente
      FROM Reporte r
      INNER JOIN Estudiante e ON e.id = r.estudianteId
      INNER JOIN Usuario u ON u.id = r.docenteId
      ORDER BY r.fecha DESC
      LIMIT 5
    `),
    consultar(`
      SELECT s.id, s.motivo, s.estado, s.urgencia, s.creadoEn,
        e.nombre AS estudiante, e.grado, a.nombre AS acudiente
      FROM Salida s
      INNER JOIN Estudiante e ON e.id = s.estudianteId
      INNER JOIN Acudiente a ON a.id = s.acudienteId
      ORDER BY s.creadoEn DESC
      LIMIT 5
    `),
  ]);

  return {
    data: {
      usuario,
      metricas: {
        usuarios,
        estudiantes,
        reportes,
        reportesPendientes,
        convivenciaAbierta,
        salidasPendientes,
        alertasActivas,
        notificacionesNoLeidas,
      },
      graficas: {
        reportesPorTipo,
        salidasPorEstado,
      },
      tablas: {
        ultimosReportes,
        ultimasSalidas,
      },
      accesos: obtenerAccesosPorRol(usuario.rol),
    },
  };
}

export async function obtenerResumenDashboard(usuario: SesionUsuario) {
  return obtenerEstadisticasDashboard(usuario);
}

function obtenerAccesosPorRol(rol: SesionUsuario['rol']) {
  if (rol === 'Admin') {
    return ['usuarios', 'estudiantes', 'reportes', 'convivencia', 'manual-convivencia', 'salidas', 'dashboard'];
  }
  if (rol === 'Coordinador') {
    return ['estudiantes', 'reportes', 'convivencia', 'manual-convivencia', 'salidas', 'dashboard'];
  }
  if (rol === 'Docente') {
    return ['estudiantes', 'reportes', 'convivencia', 'manual-convivencia', 'dashboard'];
  }
  return ['estudiantes', 'salidas', 'dashboard'];
}
