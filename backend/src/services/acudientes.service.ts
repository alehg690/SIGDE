import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export type AcudienteInput = {
  nombre: string;
  correo?: string;
  telefono?: string;
  documento?: string;
};

function validar(input: AcudienteInput) {
  const nombre = input.nombre.trim();
  if (!nombre) return { error: 'El nombre del acudiente es obligatorio', status: 400 };

  return {
    data: {
      nombre,
      correo: input.correo?.trim() || null,
      telefono: input.telefono?.trim() || null,
      documento: input.documento?.trim() || null,
    },
  };
}

export async function listarAcudientesPorEstudiante(estudianteId: number) {
  const result = await db.execute({
    sql: `
      SELECT a.*
      FROM Acudiente a
      INNER JOIN Estudiante e ON e.acudienteId = a.id
      WHERE e.id = ?
      ORDER BY a.nombre ASC
    `,
    args: [estudianteId],
  });

  return { data: result.rows };
}

export async function crearAcudiente(estudianteId: number, input: AcudienteInput, usuario: SesionUsuario) {
  const validacion = validar(input);
  if ('error' in validacion) return validacion;

  const data = validacion.data;
  const result = await db.execute({
    sql: `
      INSERT INTO Acudiente (nombre, contacto, correo, telefono, documento)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `,
    args: [data.nombre, data.telefono || data.correo || 'Sin contacto', data.correo, data.telefono, data.documento],
  });

  const acudiente = result.rows[0];
  await db.execute({
    sql: 'UPDATE Estudiante SET acudienteId = ?, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?',
    args: [Number(acudiente.id), estudianteId],
  });

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'crear_acudiente',
    entidad: 'Acudiente',
    entidadId: Number(acudiente.id),
    detalle: { estudianteId },
  });

  return { data: acudiente, status: 201 };
}

export async function editarAcudiente(id: number, input: AcudienteInput, usuario: SesionUsuario) {
  const validacion = validar(input);
  if ('error' in validacion) return validacion;

  const data = validacion.data;
  const result = await db.execute({
    sql: `
      UPDATE Acudiente
      SET nombre = ?, contacto = ?, correo = ?, telefono = ?, documento = ?
      WHERE id = ?
      RETURNING *
    `,
    args: [data.nombre, data.telefono || data.correo || 'Sin contacto', data.correo, data.telefono, data.documento, id],
  });

  if (!result.rows[0]) return { error: 'Acudiente no encontrado', status: 404 };

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'editar_acudiente',
    entidad: 'Acudiente',
    entidadId: id,
  });

  return { data: result.rows[0] };
}
