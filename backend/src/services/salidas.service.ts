import { randomUUID } from 'crypto';
import { db } from '@backend/config/database';
import { emailTransporter } from '@backend/config/email';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export type SalidaInput = {
  estudianteId: string;
  recogeNombre: string;
  recogeApellido: string;
  recogeCedula: string;
  recogeParentesco: string;
  recogeCorreo: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarInput(input: SalidaInput) {
  const data = {
    estudianteId: Number(input.estudianteId),
    recogeNombre: input.recogeNombre.trim(), recogeApellido: input.recogeApellido.trim(),
    recogeCedula: input.recogeCedula.trim(), recogeParentesco: input.recogeParentesco.trim(),
    recogeCorreo: input.recogeCorreo.trim().toLowerCase(),
  };
  if (!Number.isInteger(data.estudianteId) || data.estudianteId <= 0) return { error: 'Selecciona un estudiante válido', status: 400 };
  if (!data.recogeNombre || !data.recogeApellido || !data.recogeCedula || !data.recogeParentesco) return { error: 'Completa los datos de la persona que recoge al estudiante', status: 400 };
  if (!EMAIL_PATTERN.test(data.recogeCorreo)) return { error: 'Ingresa un correo válido para la persona que recoge', status: 400 };
  return { data };
}

async function obtenerEstudianteConAcudiente(estudianteId: number) {
  const result = await db.execute({ sql: `SELECT e.id, e.nombre, e.grado, e.grupo, e.jornada, a.id AS acudienteId, a.nombre AS acudiente, COALESCE((SELECT group_concat(a2.correo, '|') FROM EstudianteAcudiente ea INNER JOIN Acudiente a2 ON a2.id = ea.acudienteId WHERE ea.estudianteId = e.id AND a2.correo IS NOT NULL), a.correo) AS acudientesCorreo FROM Estudiante e INNER JOIN Acudiente a ON a.id = e.acudienteId WHERE e.id = ? AND e.archivado = 0 AND e.activo = 1 LIMIT 1`, args: [estudianteId] });
  return result.rows[0];
}

export async function listarSalidas(usuario: SesionUsuario) {
  const soloHoy = usuario.rol === 'Porteria';
  const result = await db.execute({ sql: `SELECT s.id, s.estudianteId, e.nombre AS estudiante, e.grado, e.grupo, e.jornada, a.nombre AS acudiente, s.recogeNombre, s.recogeApellido, s.recogeCedula, s.recogeParentesco, s.recogeCorreo, s.estado, s.creadoEn, u.nombre AS registradoPorNombre FROM Salida s INNER JOIN Estudiante e ON e.id = s.estudianteId INNER JOIN Acudiente a ON a.id = s.acudienteId INNER JOIN Usuario u ON u.id = s.registradoPorId ${soloHoy ? "WHERE date(s.creadoEn) = date('now', 'localtime')" : ''} ORDER BY s.creadoEn DESC`, args: [] });
  return { data: result.rows };
}

async function enviarAvisoSalida(destinos: string[], estudiante: string, recoge: string) {
  const correos = [...new Set(destinos.filter((correo) => EMAIL_PATTERN.test(correo)))];
  if (!correos.length || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
  try {
    await emailTransporter.sendMail({ from: `"SIGDE" <${process.env.EMAIL_USER}>`, to: correos.join(', '), subject: `Aviso de salida registrada - ${estudiante}`, text: `Se registró la salida de ${estudiante}. La persona que recoge al estudiante es ${recoge}.` });
    return true;
  } catch { return false; }
}

export async function crearSalida(input: SalidaInput, usuario: SesionUsuario) {
  const validacion = validarInput(input);
  if ('error' in validacion) return validacion;
  const data = validacion.data;
  const estudiante = await obtenerEstudianteConAcudiente(data.estudianteId);
  if (!estudiante) return { error: 'Estudiante no encontrado o inactivo', status: 404 };

  const id = randomUUID();
  const result = await db.execute({ sql: `INSERT INTO Salida (id, estudianteId, acudienteId, motivo, tipo, urgencia, estado, registradoPorId, recogeNombre, recogeApellido, recogeCedula, recogeParentesco, recogeCorreo) VALUES (?, ?, ?, ?, 'ordinaria', 0, 'completada', ?, ?, ?, ?, ?, ?) RETURNING id, creadoEn`, args: [id, data.estudianteId, Number(estudiante.acudienteId), 'Salida registrada en portería', usuario.id, data.recogeNombre, data.recogeApellido, data.recogeCedula, data.recogeParentesco, data.recogeCorreo] });
  await registrarAccion({ usuarioId: usuario.id, accion: 'registrar_salida', entidad: 'Salida', entidadId: id, detalle: { estudianteId: data.estudianteId, recogeCedula: data.recogeCedula } });
  const correoEnviado = await enviarAvisoSalida([...(String(estudiante.acudientesCorreo || '').split('|')), data.recogeCorreo], String(estudiante.nombre), `${data.recogeNombre} ${data.recogeApellido}`);
  return { data: { ...result.rows[0], estudiante: estudiante.nombre, grado: estudiante.grado, grupo: estudiante.grupo, jornada: estudiante.jornada, acudiente: estudiante.acudiente, correoEnviado }, status: 201 };
}

export async function firmarSalida(id: string, firma: string, usuario: SesionUsuario) {
  const columnasPermitidas = new Set(['firmaDirector', 'firmaDocente', 'firmaCoordinacion', 'firmaAcudiente']);
  if (!columnasPermitidas.has(firma)) return { error: 'Firma no válida', status: 400 };
  const result = await db.execute({ sql: `UPDATE Salida SET ${firma} = 1, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ? RETURNING *`, args: [id] });
  if (!result.rows[0]) return { error: 'Salida no encontrada', status: 404 };
  await registrarAccion({ usuarioId: usuario.id, accion: 'firmar_salida', entidad: 'Salida', entidadId: id, detalle: { firma } });
  return { data: result.rows[0] };
}
