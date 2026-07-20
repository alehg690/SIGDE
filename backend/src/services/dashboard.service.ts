import { db } from '@backend/config/database';
import type { SesionUsuario } from '@backend/types/roles';

async function contar(sql: string) {
  const result = await db.execute(sql);
  return Number(result.rows[0]?.total || 0);
}

export async function obtenerResumenDashboard(usuario: SesionUsuario) {
  const [
    usuarios,
    estudiantes,
    reportesPendientes,
    convivenciaAbierta,
    salidasPendientes,
  ] = await Promise.all([
    contar('SELECT COUNT(*) AS total FROM Usuario WHERE activo = 1'),
    contar('SELECT COUNT(*) AS total FROM Estudiante WHERE archivado = 0'),
    contar("SELECT COUNT(*) AS total FROM Reporte WHERE estado = 'Pendiente'"),
    contar("SELECT COUNT(*) AS total FROM ConvivenciaReporte WHERE estado = 'abierto'"),
    contar("SELECT COUNT(*) AS total FROM Salida WHERE estado = 'pendiente'"),
  ]);

  return {
    data: {
      usuario,
      metricas: {
        usuarios,
        estudiantes,
        reportesPendientes,
        convivenciaAbierta,
        salidasPendientes,
      },
      accesos: obtenerAccesosPorRol(usuario.rol),
    },
  };
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
