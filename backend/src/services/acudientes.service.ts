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
  if (nombre.length > 200) return { error: 'El nombre del acudiente es demasiado largo', status: 400 };

  const correo = input.correo?.trim().toLowerCase() || null;
  const telefono = input.telefono?.trim() || null;
  const documento = input.documento?.trim() || null;
  if (correo && (correo.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo))) {
    return { error: 'Ingresa un correo válido para el acudiente', status: 400 };
  }
  if (telefono && !/^[+0-9() -]{7,25}$/.test(telefono)) {
    return { error: 'Ingresa un teléfono válido para el acudiente', status: 400 };
  }
  if (documento && !/^[A-Za-z0-9.-]{4,30}$/.test(documento)) {
    return { error: 'El documento del acudiente no tiene un formato válido', status: 400 };
  }

  return {
    data: {
      nombre,
      correo,
      telefono,
      documento,
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
  if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
    return { error: 'Estudiante no válido', status: 400 };
  }

  const transaction = await db.transaction('write');
  let acudiente: Record<string, unknown>;
  try {
    const estudiante = await transaction.execute({
      sql: 'SELECT id FROM Estudiante WHERE id = ? AND archivado = 0 LIMIT 1',
      args: [estudianteId],
    });
    if (!estudiante.rows[0]) {
      await transaction.rollback();
      return { error: 'Estudiante no encontrado', status: 404 };
    }

    const result = await transaction.execute({
      sql: `
        INSERT INTO Acudiente (nombre, contacto, correo, telefono, documento)
        VALUES (?, ?, ?, ?, ?)
        RETURNING *
      `,
      args: [data.nombre, data.telefono || data.correo || 'Sin contacto', data.correo, data.telefono, data.documento],
    });
    acudiente = result.rows[0] as Record<string, unknown>;
    await transaction.execute({
      sql: 'UPDATE Estudiante SET acudienteId = ?, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?',
      args: [Number(acudiente.id), estudianteId],
    });
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

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
