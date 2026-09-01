import { db } from '@backend/config/database';
import { emailTransporter } from '@backend/config/email';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export async function notificarAcudientePorReporte(reporteId: number) {
  const result = await db.execute({
    sql: `
      SELECT r.id, r.descripcion, e.nombre AS estudiante, e.grado, e.grupo,
             a.id AS acudienteId, a.nombre AS acudiente, COALESCE(a.correo, a.contacto) AS destino,
             director.id AS directorId, director.nombre AS directorNombre, director.correo AS directorCorreo,
             docente.nombre AS docenteReporta
      FROM Reporte r
      INNER JOIN Estudiante e ON e.id = r.estudianteId
      INNER JOIN Acudiente a ON a.id = e.acudienteId
      INNER JOIN Usuario docente ON docente.id = r.docenteId
      LEFT JOIN GrupoEscolar ge ON ge.grado = REPLACE(e.grado, '°', '') AND ge.grupo = e.grupo
      LEFT JOIN Usuario director ON director.id = ge.directorId AND director.activo = 1
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

  if (canal === 'email' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      await emailTransporter.sendMail({
        from: `"SIGDE" <${process.env.EMAIL_USER}>`,
        to: destino,
        subject: asunto,
        text: mensaje,
      });
    } catch (error) {
      console.error('No se pudo enviar el correo automático del reporte.', error);
    }
  }

  const directorId = Number(row.directorId || 0);
  const directorCorreo = String(row.directorCorreo || '').trim();
  if (directorId > 0) {
    const asuntoDirector = `Nuevo reporte en ${row.grado}-${row.grupo}: ${row.estudiante}`;
    const mensajeDirector = `Hola ${row.directorNombre}. ${row.docenteReporta} registró un reporte para ${row.estudiante}, estudiante de tu grupo ${row.grado}-${row.grupo}. Descripción: ${row.descripcion}`;
    const canalDirector = directorCorreo.includes('@') ? 'email' : 'app';

    await db.execute({
      sql: `INSERT INTO NotificacionUsuario (usuarioId, reporteId, canal, asunto, mensaje) VALUES (?, ?, ?, ?, ?)`,
      args: [directorId, reporteId, canalDirector, asuntoDirector, mensajeDirector],
    });

    if (canalDirector === 'email' && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await emailTransporter.sendMail({
          from: `"SIGDE" <${process.env.EMAIL_USER}>`,
          to: directorCorreo,
          subject: asuntoDirector,
          text: mensajeDirector,
        });
      } catch (error) {
        console.error('No se pudo enviar el correo al director de grupo.', error);
      }
    }
  }
}

export async function listarNotificaciones(acudienteId?: number) {
  const result = await db.execute({
    sql: `
      SELECT n.id, n.acudienteId, n.reporteId, n.canal, n.asunto, n.mensaje,
             n.leida, n.enviadoEn, a.nombre AS acudiente,
             COALESCE(a.correo, '') AS correo,
             COALESCE(a.telefono, a.contacto, '') AS telefono,
             e.id AS estudianteId, e.nombre AS estudiante, e.grado, e.grupo
      FROM Notificacion n
      INNER JOIN Acudiente a ON a.id = n.acudienteId
      LEFT JOIN Reporte r ON r.id = n.reporteId
      LEFT JOIN Estudiante e ON e.id = COALESCE(r.estudianteId, (
        SELECT e2.id FROM Estudiante e2 WHERE e2.acudienteId = n.acudienteId ORDER BY e2.nombre LIMIT 1
      ))
      WHERE (? IS NULL OR n.acudienteId = ?)
      ORDER BY n.enviadoEn DESC
      LIMIT 200
    `,
    args: [acudienteId ?? null, acudienteId ?? null],
  });

  return { data: result.rows };
}

export async function crearNotificacionManual(input: {
  acudienteId: number;
  asunto: string;
  mensaje: string;
  canal: string;
}, usuario: SesionUsuario) {
  if (!Number.isInteger(input.acudienteId) || input.acudienteId <= 0) {
    return { error: 'Selecciona un acudiente válido', status: 400 };
  }

  const asunto = input.asunto.trim();
  const mensaje = input.mensaje.trim();
  const canal = input.canal === 'email' ? 'email' : 'app';
  if (asunto.length < 4 || asunto.length > 160) {
    return { error: 'El asunto debe tener entre 4 y 160 caracteres', status: 400 };
  }
  if (mensaje.length < 10 || mensaje.length > 3000) {
    return { error: 'El mensaje debe tener entre 10 y 3000 caracteres', status: 400 };
  }

  const acudienteResult = await db.execute({
    sql: 'SELECT id, nombre, correo FROM Acudiente WHERE id = ? LIMIT 1',
    args: [input.acudienteId],
  });
  const acudiente = acudienteResult.rows[0];
  if (!acudiente) return { error: 'El acudiente no existe', status: 404 };
  const correo = String(acudiente.correo || '').trim();
  if (canal === 'email' && !correo.includes('@')) {
    return { error: 'El acudiente seleccionado no tiene un correo válido', status: 400 };
  }

  const result = await db.execute({
    sql: `
      INSERT INTO Notificacion (acudienteId, canal, asunto, mensaje)
      VALUES (?, ?, ?, ?)
      RETURNING id, acudienteId, reporteId, canal, asunto, mensaje, leida, enviadoEn
    `,
    args: [input.acudienteId, canal, asunto, mensaje],
  });

  let correoEnviado = false;
  let aviso: string | null = null;
  if (canal === 'email') {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      try {
        await emailTransporter.sendMail({
          from: `"SIGDE" <${process.env.EMAIL_USER}>`,
          to: correo,
          subject: asunto,
          text: mensaje,
        });
        correoEnviado = true;
      } catch (error) {
        console.error('No se pudo enviar el comunicado por correo.', error);
        aviso = 'El comunicado quedó registrado, pero el proveedor de correo no respondió.';
      }
    } else {
      aviso = 'El comunicado quedó registrado. Configura EMAIL_USER y EMAIL_PASS para enviarlo por correo.';
    }
  }

  const notificacion = result.rows[0];
  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'crear_comunicacion',
    entidad: 'Notificacion',
    entidadId: Number(notificacion.id),
    detalle: { acudienteId: input.acudienteId, canal, correoEnviado },
  });

  return {
    data: {
      ...notificacion,
      acudiente: String(acudiente.nombre),
      correo,
      correoEnviado,
      aviso,
    },
    status: 201,
  };
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
