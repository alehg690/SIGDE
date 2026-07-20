import { db } from '@backend/config/database';
import { emailTransporter } from '@backend/config/email';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export async function notificarAcudientePorReporte(reporteId: number) {
  const result = await db.execute({
    sql: `
      SELECT r.id, r.descripcion, e.nombre AS estudiante, a.id AS acudienteId, a.nombre AS acudiente,
             COALESCE(a.correo, a.contacto) AS destino
      FROM Reporte r
      INNER JOIN Estudiante e ON e.id = r.estudianteId
      INNER JOIN Acudiente a ON a.id = e.acudienteId
      WHERE r.id = ?
      LIMIT 1
    `,
    args: [reporteId],
  });

  const row = result.rows[0];
  if (!row) return;

  const asunto = `Reporte de convivencia - ${row.estudiante}`;
  const mensaje = `Se registró un reporte de convivencia para ${row.estudiante}. Descripción: ${row.descripcion}`;
  const destino = String(row.destino || '');
  const canal = destino.includes('@') ? 'email' : 'app';

  await db.execute({
    sql: `
      INSERT INTO Notificacion (acudienteId, reporteId, canal, asunto, mensaje)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [Number(row.acudienteId), reporteId, canal, asunto, mensaje],
  });

  if (canal === 'email') {
    await emailTransporter.sendMail({
      from: `"no.reply-SIGDE" <${process.env.EMAIL_USER}>`,
      to: destino,
      subject: asunto,
      text: mensaje,
    });
  }
}

export async function listarNotificacionesPorAcudiente(acudienteId: number) {
  const result = await db.execute({
    sql: `
      SELECT *
      FROM Notificacion
      WHERE acudienteId = ?
      ORDER BY enviadoEn DESC
    `,
    args: [acudienteId],
  });

  return { data: result.rows };
}

export async function marcarComoLeida(id: number, usuario: SesionUsuario) {
  const result = await db.execute({
    sql: 'UPDATE Notificacion SET leida = true WHERE id = ? RETURNING *',
    args: [id],
  });

  if (!result.rows[0]) return { error: 'Notificación no encontrada', status: 404 };

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'marcar_notificacion_leida',
    entidad: 'Notificacion',
    entidadId: id,
  });

  return { data: result.rows[0] };
}
