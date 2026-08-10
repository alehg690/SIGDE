import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

type EstudianteRow = {
  id: number;
  nombre: string;
  grado: string;
  grupo: string;
  estado: string;
  archivado: number;
  documento: string | null;
  activo: number;
  creadoEn: string;
  actualizadoEn: string;
  acudienteId: number;
  acudienteNombre: string;
  acudienteContacto: string;
  acudienteCorreo: string | null;
  acudienteTelefono: string | null;
  acudienteDocumento: string | null;
};

export type EstudianteInput = {
  nombre: string;
  grado: string;
  grupo: string;
  estado?: string;
  documento?: string;
  activo?: boolean;
  acudienteNombre: string;
  acudienteContacto?: string;
  acudienteCorreo?: string;
  acudienteTelefono?: string;
  acudienteDocumento?: string;
};

function mapEstudiante(row: EstudianteRow) {
  return {
    id: row.id,
    nombre: row.nombre,
    grado: row.grado,
    grupo: row.grupo,
    estado: row.estado,
    documento: row.documento,
    activo: Boolean(row.activo),
    archivado: Boolean(row.archivado),
    creadoEn: row.creadoEn,
    actualizadoEn: row.actualizadoEn,
    acudiente: {
      id: row.acudienteId,
      nombre: row.acudienteNombre,
      contacto: row.acudienteContacto,
      correo: row.acudienteCorreo,
      telefono: row.acudienteTelefono,
      documento: row.acudienteDocumento,
    },
  };
}

function validarInput(input: EstudianteInput) {
  const nombre = input.nombre.trim();
  const grado = input.grado.trim();
  const grupo = input.grupo.trim();
  const estado = (input.estado || 'Activo').trim();
  const documento = input.documento?.trim() || null;
  const activo = input.activo === false ? 0 : 1;
  const acudienteNombre = input.acudienteNombre.trim();
  const acudienteCorreo = input.acudienteCorreo?.trim().toLowerCase() || null;
  const acudienteTelefono = input.acudienteTelefono?.trim() || input.acudienteContacto?.trim() || null;
  const acudienteDocumento = input.acudienteDocumento?.trim() || null;
  const acudienteContacto = acudienteTelefono || acudienteCorreo;

  if (!nombre) return { error: 'El nombre del estudiante es obligatorio', status: 400 };
  if (!grado) return { error: 'El grado es obligatorio', status: 400 };
  if (!grupo) return { error: 'El grupo es obligatorio', status: 400 };
  if (!acudienteNombre) return { error: 'El acudiente es obligatorio', status: 400 };
  if (!acudienteContacto) return { error: 'Registra el teléfono o correo del acudiente', status: 400 };
  if (acudienteCorreo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(acudienteCorreo)) {
    return { error: 'El correo del acudiente no es válido', status: 400 };
  }

  return {
    data: {
      nombre,
      grado,
      grupo,
      estado,
      documento,
      activo,
      acudienteNombre,
      acudienteContacto,
      acudienteCorreo,
      acudienteTelefono,
      acudienteDocumento,
    },
  };
}

export async function listarEstudiantes() {
  const result = await db.execute(`
    SELECT
      e.id, e.nombre, e.documento, e.grado, e.grupo, e.estado, e.activo, e.archivado, e.creadoEn, e.actualizadoEn,
      a.id AS acudienteId, a.nombre AS acudienteNombre, a.contacto AS acudienteContacto,
      a.correo AS acudienteCorreo, a.telefono AS acudienteTelefono, a.documento AS acudienteDocumento
    FROM Estudiante e
    INNER JOIN Acudiente a ON a.id = e.acudienteId
    WHERE e.archivado = 0 AND e.activo = 1
    ORDER BY e.nombre ASC
  `);

  return { data: result.rows.map((row) => mapEstudiante(row as unknown as EstudianteRow)) };
}

export async function crearEstudiante(input: EstudianteInput, usuario?: SesionUsuario) {
  const validacion = validarInput(input);
  if ('error' in validacion) return validacion;

  const data = validacion.data;

  const result = await db.batch(
    [
      {
        sql: `
          INSERT INTO Acudiente (nombre, contacto, correo, telefono, documento)
          VALUES (?, ?, ?, ?, ?)
          RETURNING id
        `,
        args: [
          data.acudienteNombre,
          data.acudienteContacto,
          data.acudienteCorreo,
          data.acudienteTelefono,
          data.acudienteDocumento,
        ],
      },
      {
        sql: `
          INSERT INTO Estudiante (nombre, documento, grado, grupo, estado, activo, acudienteId)
          VALUES (?, ?, ?, ?, ?, ?, last_insert_rowid())
          RETURNING id
        `,
        args: [data.nombre, data.documento, data.grado, data.grupo, data.estado, data.activo],
      },
    ],
    'write'
  );

  const estudianteId = Number(result[1].rows[0]?.id);
  if (usuario) {
    await registrarAccion({
      usuarioId: usuario.id,
      accion: 'crear_estudiante',
      entidad: 'Estudiante',
      entidadId: estudianteId,
    });
  }
  return obtenerEstudiante(estudianteId, 201);
}

export async function obtenerEstudiante(id: number, status = 200) {
  const result = await db.execute({
    sql: `
      SELECT
        e.id, e.nombre, e.documento, e.grado, e.grupo, e.estado, e.activo, e.archivado, e.creadoEn, e.actualizadoEn,
        a.id AS acudienteId, a.nombre AS acudienteNombre, a.contacto AS acudienteContacto,
        a.correo AS acudienteCorreo, a.telefono AS acudienteTelefono, a.documento AS acudienteDocumento
      FROM Estudiante e
      INNER JOIN Acudiente a ON a.id = e.acudienteId
      WHERE e.id = ?
      LIMIT 1
    `,
    args: [id],
  });

  if (!result.rows[0]) return { error: 'Estudiante no encontrado', status: 404 };
  return { data: mapEstudiante(result.rows[0] as unknown as EstudianteRow), status };
}

export async function actualizarEstudiante(id: number, input: EstudianteInput, usuario?: SesionUsuario) {
  const validacion = validarInput(input);
  if ('error' in validacion) return validacion;

  const actual = await db.execute({
    sql: 'SELECT acudienteId FROM Estudiante WHERE id = ? LIMIT 1',
    args: [id],
  });

  if (!actual.rows[0]) return { error: 'Estudiante no encontrado', status: 404 };

  const data = validacion.data;
  const acudienteId = Number(actual.rows[0].acudienteId);

  await db.batch(
    [
      {
        sql: `
          UPDATE Acudiente
          SET nombre = ?, contacto = ?, correo = ?, telefono = ?, documento = ?
          WHERE id = ?
        `,
        args: [
          data.acudienteNombre,
          data.acudienteContacto,
          data.acudienteCorreo,
          data.acudienteTelefono,
          data.acudienteDocumento,
          acudienteId,
        ],
      },
      {
        sql: `
          UPDATE Estudiante
          SET nombre = ?, documento = ?, grado = ?, grupo = ?, estado = ?, activo = ?, actualizadoEn = CURRENT_TIMESTAMP
          WHERE id = ?
        `,
        args: [data.nombre, data.documento, data.grado, data.grupo, data.estado, data.activo, id],
      },
    ],
    'write'
  );

  if (usuario) {
    await registrarAccion({
      usuarioId: usuario.id,
      accion: 'actualizar_estudiante',
      entidad: 'Estudiante',
      entidadId: id,
    });
  }

  return obtenerEstudiante(id);
}

export async function archivarEstudiante(id: number, usuario?: SesionUsuario) {
  const result = await db.execute({
    sql: `
      UPDATE Estudiante
      SET archivado = 1, actualizadoEn = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id
    `,
    args: [id],
  });

  if (!result.rows[0]) return { error: 'Estudiante no encontrado', status: 404 };
  if (usuario) {
    await registrarAccion({
      usuarioId: usuario.id,
      accion: 'archivar_estudiante',
      entidad: 'Estudiante',
      entidadId: id,
    });
  }
  return { data: { mensaje: 'Estudiante archivado correctamente' } };
}
