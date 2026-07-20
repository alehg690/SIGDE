import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import { obtenerValorConfiguracion } from '@backend/services/configuracion.service';
import type { SesionUsuario } from '@backend/types/roles';

export async function evaluarAlertaEstudiante(estudianteId: number, usuario: SesionUsuario) {
  const umbral = Number(await obtenerValorConfiguracion('alertas.umbralReportes', '3'));
  const periodoDias = Number(await obtenerValorConfiguracion('alertas.periodoDias', '30'));

  const conteo = await db.execute({
    sql: `
      SELECT COUNT(*) AS total
      FROM Reporte
      WHERE estudianteId = ?
        AND creadoEn >= datetime('now', ?)
    `,
    args: [estudianteId, `-${periodoDias} days`],
  });

  const total = Number(conteo.rows[0]?.total || 0);
  if (total < umbral) return { data: null };

  const activa = await db.execute({
    sql: "SELECT id FROM Alerta WHERE estudianteId = ? AND estado <> 'resuelta' LIMIT 1",
    args: [estudianteId],
  });

  if (activa.rows[0]) return { data: activa.rows[0] };

  const result = await db.execute({
    sql: `
      INSERT INTO Alerta (estudianteId, cantidadReportes, estado, notas)
      VALUES (?, ?, 'activa', ?)
      RETURNING *
    `,
    args: [estudianteId, total, `Umbral alcanzado: ${total} reportes en ${periodoDias} días.`],
  });

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'crear_alerta',
    entidad: 'Alerta',
    entidadId: Number(result.rows[0].id),
    detalle: { estudianteId, total, umbral, periodoDias },
  });

  return { data: result.rows[0] };
}

export async function listarAlertasActivas() {
  const result = await db.execute(`
    SELECT a.*, e.nombre AS estudiante, e.grado, e.grupo
    FROM Alerta a
    INNER JOIN Estudiante e ON e.id = a.estudianteId
    WHERE a.estado <> 'resuelta'
    ORDER BY a.creadoEn DESC
  `);

  return { data: result.rows };
}

export async function marcarAlerta(id: number, estado: string, notas: string | undefined, usuario: SesionUsuario) {
  const estados = new Set(['activa', 'en_seguimiento', 'resuelta']);
  if (!estados.has(estado)) return { error: 'Estado de alerta no válido', status: 400 };

  const result = await db.execute({
    sql: `
      UPDATE Alerta
      SET estado = ?, notas = COALESCE(?, notas), actualizadoEn = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `,
    args: [estado, notas?.trim() || null, id],
  });

  if (!result.rows[0]) return { error: 'Alerta no encontrada', status: 404 };

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'marcar_alerta',
    entidad: 'Alerta',
    entidadId: id,
    detalle: { estado, notas },
  });

  return { data: result.rows[0] };
}

export async function escalarAlerta(id: number, usuario: SesionUsuario) {
  return marcarAlerta(id, 'en_seguimiento', 'Escalada para revisión directiva.', usuario);
}
