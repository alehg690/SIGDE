import { randomUUID } from 'crypto';
import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export type SalidaInput = {
  estudianteId: string;
  motivo: string;
  urgencia?: boolean;
  estado?: string;
  estudiante?: string;
  grado?: string;
  acudiente?: string;
};

function validarInput(input: SalidaInput) {
  const estudianteId = Number(input.estudianteId);
  const data = {
    estudianteId,
    motivo: input.motivo.trim(),
    urgencia: input.urgencia ? 1 : 0,
    estado: (input.estado || 'pendiente').trim(),
    tipo: input.urgencia ? 'urgente' : 'ordinaria',
  };

  if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
    return { error: 'Selecciona un estudiante valido', status: 400 };
  }
  if (!data.motivo) return { error: 'El motivo de salida es obligatorio', status: 400 };

  return { data };
}

async function obtenerEstudianteConAcudiente(estudianteId: number) {
  const result = await db.execute({
    sql: `
      SELECT
        e.id, e.nombre, e.grado, e.grupo,
        a.id AS acudienteId, a.nombre AS acudiente
      FROM Estudiante e
      INNER JOIN Acudiente a ON a.id = e.acudienteId
      WHERE e.id = ? AND e.archivado = 0 AND e.activo = 1
      LIMIT 1
    `,
    args: [estudianteId],
  });

  return result.rows[0];
}

export async function listarSalidas(usuario: SesionUsuario) {
  const soloHoy = usuario.rol === 'Porteria';
  const result = await db.execute({
    sql: `
      SELECT
        s.id, s.estudianteId, e.nombre AS estudiante, e.grado, e.grupo,
        s.acudienteId, a.nombre AS acudiente, s.motivo, s.tipo, s.urgencia,
        s.firmaDirector, s.firmaDocente, s.firmaCoordinacion, s.firmaAcudiente,
        s.estado, s.registradoPorId, u.nombre AS registradoPorNombre,
        s.creadoEn, s.actualizadoEn
      FROM Salida s
      INNER JOIN Estudiante e ON e.id = s.estudianteId
      INNER JOIN Acudiente a ON a.id = s.acudienteId
      INNER JOIN Usuario u ON u.id = s.registradoPorId
      ${soloHoy ? "WHERE date(s.creadoEn) = date('now', 'localtime')" : ''}
      ORDER BY s.creadoEn DESC
    `,
    args: [],
  });

  return { data: result.rows };
}

export async function crearSalida(input: SalidaInput, usuario: SesionUsuario) {
  const validacion = validarInput(input);
  if ('error' in validacion) return validacion;

  const data = validacion.data;
  const id = randomUUID();
  const estudiante = await obtenerEstudianteConAcudiente(data.estudianteId);

  if (!estudiante) return { error: 'Estudiante no encontrado', status: 404 };

  const result = await db.execute({
    sql: `
      INSERT INTO Salida (
        id, estudianteId, acudienteId, motivo, tipo, urgencia, estado, registradoPorId
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, estudianteId, acudienteId, motivo, tipo, urgencia, firmaDirector,
        firmaDocente, firmaCoordinacion, firmaAcudiente, estado, registradoPorId, creadoEn, actualizadoEn
    `,
    args: [
      id,
      data.estudianteId,
      Number(estudiante.acudienteId),
      data.motivo,
      data.tipo,
      data.urgencia,
      data.estado,
      usuario.id,
    ],
  });

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'registrar_salida',
    entidad: 'Salida',
    entidadId: id,
    detalle: { estudianteId: data.estudianteId, urgencia: Boolean(data.urgencia) },
  });

  return { data: { ...result.rows[0], estudiante: estudiante.nombre, grado: estudiante.grado, acudiente: estudiante.acudiente }, status: 201 };
}

export async function firmarSalida(id: string, firma: string, usuario: SesionUsuario) {
  const columnasPermitidas = new Set([
    'firmaDirector',
    'firmaDocente',
    'firmaCoordinacion',
    'firmaAcudiente',
  ]);

  if (!columnasPermitidas.has(firma)) {
    return { error: 'Firma no válida', status: 400 };
  }

  const result = await db.execute({
    sql: `
      UPDATE Salida
      SET ${firma} = 1, actualizadoEn = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING *
    `,
    args: [id],
  });

  if (!result.rows[0]) return { error: 'Salida no encontrada', status: 404 };

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'firmar_salida',
    entidad: 'Salida',
    entidadId: id,
    detalle: { firma },
  });

  return { data: result.rows[0] };
}
