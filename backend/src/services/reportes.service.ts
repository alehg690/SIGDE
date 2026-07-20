import { randomUUID } from 'crypto';
import { db } from '@backend/config/database';
import { evaluarAlertaEstudiante } from '@backend/services/alertas.service';
import { registrarAccion } from '@backend/services/auditoria.service';
import { normalizarTipoSituacion, obtenerReglaTipo } from '@backend/services/manual-convivencia.service';
import { notificarAcudientePorReporte } from '@backend/services/notificaciones.service';
import type { SesionUsuario } from '@backend/types/roles';

export type ReporteInput = {
  estudianteId: number;
  tipoFalta: number;
  descripcion: string;
  confidencial?: boolean;
  evidenciaUrl?: string;
};

export type ConvivenciaInput = {
  estudianteId: string;
  estudiante: string;
  grado: string;
  tipo: string;
  descripcion: string;
  etapa: string;
  competencia: string;
  notificacionAcudiente: string;
  requiereSiuce?: boolean;
  evidencia?: string;
};

function validarReporte(input: ReporteInput) {
  if (!Number.isInteger(input.estudianteId) || input.estudianteId <= 0) {
    return { error: 'Selecciona un estudiante válido', status: 400 };
  }
  const tipoFalta = normalizarTipoFalta(input.tipoFalta);
  if (!tipoFalta) {
    return { error: 'Selecciona un tipo de falta válido', status: 400 };
  }
  if (!input.descripcion.trim()) {
    return { error: 'La descripción es obligatoria', status: 400 };
  }

  return {
    data: {
      estudianteId: input.estudianteId,
      tipoFalta,
      descripcion: input.descripcion.trim(),
      confidencial: input.confidencial ? 1 : 0,
      evidenciaUrl: input.evidenciaUrl?.trim() || null,
    },
  };
}

function normalizarTipoFalta(tipoFalta: number) {
  if (tipoFalta === 1) return 'TIPO_I';
  if (tipoFalta === 2) return 'TIPO_II';
  if (tipoFalta === 3) return 'TIPO_III';
  return null;
}

function validarConvivencia(input: ConvivenciaInput) {
  const tipoNormalizado = normalizarTipoSituacion(input.tipo);

  if (!tipoNormalizado) {
    return { error: 'Selecciona una situación Tipo I, Tipo II o Tipo III', status: 400 };
  }

  const regla = obtenerReglaTipo(tipoNormalizado);
  const data = {
    estudianteId: input.estudianteId.trim(),
    estudiante: input.estudiante.trim(),
    grado: input.grado.trim(),
    tipo: tipoNormalizado,
    descripcion: input.descripcion.trim(),
    etapa: input.etapa.trim() || `Acción ${regla.accion}`,
    competencia: input.competencia.trim() || regla.competencia,
    notificacionAcudiente: input.notificacionAcudiente.trim(),
    requiereSiuce: regla.requiereSiuce || input.requiereSiuce ? 1 : 0,
    evidencia: input.evidencia?.trim() || null,
  };

  if (!data.estudianteId || !data.estudiante || !data.grado) {
    return { error: 'Los datos del estudiante son obligatorios', status: 400 };
  }
  if (!data.descripcion || !data.etapa || !data.competencia) {
    return { error: 'Completa los datos del reporte de convivencia', status: 400 };
  }
  if (!data.notificacionAcudiente) {
    return { error: 'Indica cómo se notificó al acudiente', status: 400 };
  }

  return { data };
}

export async function listarReportes() {
  const result = await db.execute(`
    SELECT
      r.id, r.tipoFalta, r.descripcion, r.evidenciaUrl, r.observaciones, r.fecha, r.estado,
      r.confidencial, r.editableHasta, r.creadoEn, r.actualizadoEn,
      e.id AS estudianteId, e.nombre AS estudiante, e.grado, e.grupo,
      u.id AS docenteId, u.nombre AS docente
    FROM Reporte r
    INNER JOIN Estudiante e ON e.id = r.estudianteId
    INNER JOIN Usuario u ON u.id = r.docenteId
    ORDER BY r.fecha DESC
  `);

  return { data: result.rows };
}

export async function crearReporte(input: ReporteInput, usuario: SesionUsuario) {
  const validacion = validarReporte(input);
  if ('error' in validacion) return validacion;

  const data = validacion.data;
  const editableHasta = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const result = await db.execute({
    sql: `
      INSERT INTO Reporte (estudianteId, docenteId, tipoFalta, descripcion, confidencial, evidenciaUrl, editableHasta)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      RETURNING id, estudianteId, docenteId, tipoFalta, descripcion, evidenciaUrl, observaciones,
        fecha, estado, confidencial, editableHasta, creadoEn, actualizadoEn
    `,
    args: [
      data.estudianteId,
      usuario.id,
      data.tipoFalta,
      data.descripcion,
      data.confidencial,
      data.evidenciaUrl,
      editableHasta,
    ],
  });

  const reporte = result.rows[0];
  const reporteId = Number(reporte.id);

  await notificarAcudientePorReporte(reporteId);
  await evaluarAlertaEstudiante(data.estudianteId, usuario);
  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'crear_reporte',
    entidad: 'Reporte',
    entidadId: reporteId,
    detalle: { estudianteId: data.estudianteId, tipoFalta: data.tipoFalta },
  });

  return { data: result.rows[0], status: 201 };
}

export async function editarReporte(id: number, docenteId: number, input: Partial<ReporteInput>) {
  const actual = await db.execute({
    sql: 'SELECT docenteId, editableHasta, estado FROM Reporte WHERE id = ? LIMIT 1',
    args: [id],
  });

  const row = actual.rows[0];
  if (!row) return { error: 'Reporte no encontrado', status: 404 };
  if (Number(row.docenteId) !== docenteId) return { error: 'Solo el docente creador puede editar el reporte', status: 403 };
  if (row.editableHasta && new Date() > new Date(String(row.editableHasta))) {
    return { error: 'El tiempo de edición del reporte ya venció', status: 403 };
  }
  if (String(row.estado).toLowerCase() !== 'pendiente') {
    return { error: 'Solo se pueden editar reportes pendientes', status: 403 };
  }

  const descripcion = String(input.descripcion || '').trim();
  if (!descripcion) return { error: 'La descripción es obligatoria', status: 400 };

  const result = await db.execute({
    sql: `
      UPDATE Reporte
      SET descripcion = ?, evidenciaUrl = ?, actualizadoEn = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, estudianteId, docenteId, tipoFalta, descripcion, evidenciaUrl, observaciones,
        fecha, estado, confidencial, editableHasta, creadoEn, actualizadoEn
    `,
    args: [descripcion, input.evidenciaUrl?.trim() || null, id],
  });

  await registrarAccion({
    usuarioId: docenteId,
    accion: 'editar_reporte',
    entidad: 'Reporte',
    entidadId: id,
  });

  return { data: result.rows[0] };
}

export async function cambiarEstadoReporte(id: number, estado: string, observaciones: string | undefined, usuario: SesionUsuario) {
  const estadoLimpio = estado.trim();
  if (!estadoLimpio) return { error: 'El estado es obligatorio', status: 400 };

  const result = await db.execute({
    sql: `
      UPDATE Reporte
      SET estado = ?, observaciones = ?, actualizadoEn = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, estudianteId, docenteId, tipoFalta, descripcion, evidenciaUrl, observaciones,
        fecha, estado, confidencial, editableHasta, creadoEn, actualizadoEn
    `,
    args: [estadoLimpio, observaciones?.trim() || null, id],
  });

  if (!result.rows[0]) return { error: 'Reporte no encontrado', status: 404 };

  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'cambiar_estado_reporte',
    entidad: 'Reporte',
    entidadId: id,
    detalle: { estado: estadoLimpio, observaciones },
  });

  return { data: result.rows[0] };
}

export async function listarConvivencia() {
  const result = await db.execute(`
    SELECT *
    FROM ConvivenciaReporte
    ORDER BY creadoEn DESC
  `);

  return { data: result.rows };
}

export async function crearConvivencia(input: ConvivenciaInput, usuario: SesionUsuario) {
  const validacion = validarConvivencia(input);
  if ('error' in validacion) return validacion;

  const data = validacion.data;
  const id = randomUUID();

  const result = await db.execute({
    sql: `
      INSERT INTO ConvivenciaReporte (
        id, estudianteId, estudiante, grado, tipo, descripcion, etapa, competencia,
        notificacionAcudiente, requiereSiuce, creadoPorId, creadoPorNombre, creadoPorRol, evidencia
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `,
    args: [
      id,
      data.estudianteId,
      data.estudiante,
      data.grado,
      data.tipo,
      data.descripcion,
      data.etapa,
      data.competencia,
      data.notificacionAcudiente,
      data.requiereSiuce,
      usuario.id,
      usuario.nombre,
      usuario.rol,
      data.evidencia,
    ],
  });

  return { data: result.rows[0], status: 201 };
}
