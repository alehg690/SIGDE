import { randomUUID } from 'crypto';
import { db } from '@backend/config/database';
import { evaluarAlertaEstudiante } from '@backend/services/alertas.service';
import { registrarAccion } from '@backend/services/auditoria.service';
import { normalizarTipoSituacion, obtenerReglaTipo } from '@backend/services/manual-convivencia.service';
import { notificarAcudienteCambioReporte, notificarAcudientePorReporte } from '@backend/services/notificaciones.service';
import type { SesionUsuario } from '@backend/types/roles';

export type ReporteInput = {
  estudianteId: number;
  tipoFalta: number;
  fechaHecho?: string;
  lugar?: string;
  situacion?: string;
  descripcion: string;
  actuacionInicial?: string;
  confidencial?: boolean;
  evidenciaUrl?: string;
};

export type EdicionReporteInput = {
  fechaHecho?: string;
  lugar?: string;
  situacion?: string;
  descripcion?: string;
  actuacionInicial?: string;
  confidencial?: boolean;
};

export type EvidenciaReporteInput = { nombre: string; tipo: string; url: string };

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

const ESTADOS_REPORTE = ['Pendiente', 'EnRevision', 'Cerrado', 'Anulado'] as const;
const TRANSICIONES_REPORTE: Record<string, string[]> = {
  Pendiente: ['EnRevision', 'Cerrado', 'Anulado'],
  EnRevision: ['Pendiente', 'Cerrado', 'Anulado'],
  Cerrado: ['EnRevision'],
  Anulado: [],
};

function normalizarTipoFalta(tipoFalta: number) {
  if (tipoFalta === 1) return 'TIPO_I';
  if (tipoFalta === 2) return 'TIPO_II';
  if (tipoFalta === 3) return 'TIPO_III';
  return null;
}

function validarUrlHttp(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validarFechaHecho(value: string | undefined) {
  if (!value) return null;
  const fecha = new Date(value);
  if (Number.isNaN(fecha.getTime())) return null;
  const ahora = Date.now();
  if (fecha.getTime() > ahora + 5 * 60 * 1000) return null;
  if (fecha.getTime() < ahora - 365 * 24 * 60 * 60 * 1000) return null;
  return fecha.toISOString();
}

function validarReporte(input: ReporteInput) {
  if (!Number.isInteger(input.estudianteId) || input.estudianteId <= 0) {
    return { error: 'Selecciona un estudiante válido', status: 400 } as const;
  }
  const tipoFalta = normalizarTipoFalta(input.tipoFalta);
  if (!tipoFalta) return { error: 'Selecciona un tipo de situación válido', status: 400 } as const;

  const fechaHecho = validarFechaHecho(input.fechaHecho);
  if (!fechaHecho) {
    return { error: 'Indica una fecha válida del hecho, dentro del último año y no posterior a la hora actual', status: 400 } as const;
  }
  const lugar = input.lugar?.trim() || '';
  if (lugar.length < 3 || lugar.length > 120) return { error: 'El lugar debe tener entre 3 y 120 caracteres', status: 400 } as const;
  const situacion = input.situacion?.trim() || '';
  if (situacion.length < 3 || situacion.length > 220) return { error: 'Selecciona o describe la situación presentada', status: 400 } as const;
  const descripcion = input.descripcion.trim();
  if (descripcion.length < 20 || descripcion.length > 2000) return { error: 'La descripción debe tener entre 20 y 2000 caracteres', status: 400 } as const;
  const actuacionInicial = input.actuacionInicial?.trim() || '';
  if (actuacionInicial.length < 3 || actuacionInicial.length > 1000) return { error: 'La actuación inicial debe tener entre 3 y 1000 caracteres', status: 400 } as const;
  const evidenciaUrl = input.evidenciaUrl?.trim() || null;
  if (evidenciaUrl && !validarUrlHttp(evidenciaUrl)) return { error: 'El enlace de evidencia debe ser una dirección HTTP o HTTPS válida', status: 400 } as const;

  return {
    data: {
      estudianteId: input.estudianteId,
      tipoFalta,
      fechaHecho,
      lugar,
      situacion,
      descripcion,
      actuacionInicial,
      confidencial: input.confidencial ? 1 : 0,
      evidenciaUrl,
    },
  } as const;
}

function puedeGestionarRegistro(usuario: SesionUsuario, docenteId: number) {
  return usuario.rol === 'Coordinador' || usuario.id === docenteId;
}

function edicionVigente(row: Record<string, unknown>) {
  return String(row.estado).toLowerCase() === 'pendiente'
    && Boolean(row.editableHasta)
    && new Date(String(row.editableHasta)).getTime() > Date.now();
}

function reportarEfectoFallido(nombre: string, reason: unknown) {
  console.error(`No se pudo completar el efecto secundario del reporte: ${nombre}.`, reason);
}

export async function listarReportes(usuario: SesionUsuario) {
  const result = await db.execute({
    sql: `
      SELECT
        r.id, r.tipoFalta, r.fechaHecho, r.lugar, r.situacion, r.descripcion,
        r.actuacionInicial, r.evidenciaUrl, r.observaciones, r.fecha, r.estado,
        r.confidencial, r.editableHasta, r.creadoEn, r.actualizadoEn,
        e.id AS estudianteId, e.nombre AS estudiante, e.grado, e.grupo,
        u.id AS docenteId, u.nombre AS docente,
        (SELECT COUNT(*) FROM EvidenciaReporte er WHERE er.reporteId = r.id) AS evidenciasCount,
        (SELECT COUNT(*) FROM ObservacionReporte obr WHERE obr.reporteId = r.id) AS observacionesCount,
        ((SELECT COUNT(*) FROM Notificacion n WHERE n.reporteId = r.id)
          + (SELECT COUNT(*) FROM NotificacionUsuario nu WHERE nu.reporteId = r.id)) AS notificacionesCount
      FROM Reporte r
      INNER JOIN Estudiante e ON e.id = r.estudianteId
      INNER JOIN Usuario u ON u.id = r.docenteId
      WHERE r.confidencial = 0 OR ? = 'Coordinador' OR r.docenteId = ?
      ORDER BY datetime(r.fecha) DESC
      LIMIT 500
    `,
    args: [usuario.rol, usuario.id],
  });
  return { data: result.rows };
}

export async function obtenerReporte(id: number, usuario: SesionUsuario) {
  const result = await db.execute({
    sql: `
      SELECT
        r.id, r.tipoFalta, r.fechaHecho, r.lugar, r.situacion, r.descripcion,
        r.actuacionInicial, r.evidenciaUrl, r.observaciones, r.fecha, r.estado,
        r.confidencial, r.editableHasta, r.creadoEn, r.actualizadoEn,
        e.id AS estudianteId, e.nombre AS estudiante, e.grado, e.grupo,
        u.id AS docenteId, u.nombre AS docente,
        (SELECT COUNT(*) FROM EvidenciaReporte er WHERE er.reporteId = r.id) AS evidenciasCount,
        (SELECT COUNT(*) FROM ObservacionReporte obr WHERE obr.reporteId = r.id) AS observacionesCount,
        ((SELECT COUNT(*) FROM Notificacion n WHERE n.reporteId = r.id)
          + (SELECT COUNT(*) FROM NotificacionUsuario nu WHERE nu.reporteId = r.id)) AS notificacionesCount
      FROM Reporte r
      INNER JOIN Estudiante e ON e.id = r.estudianteId
      INNER JOIN Usuario u ON u.id = r.docenteId
      WHERE r.id = ? AND (r.confidencial = 0 OR ? = 'Coordinador' OR r.docenteId = ?)
      LIMIT 1
    `,
    args: [id, usuario.rol, usuario.id],
  });
  const reporte = result.rows[0];
  if (!reporte) return { error: 'Reporte no encontrado', status: 404 } as const;

  const [evidencias, observaciones] = await Promise.all([
    db.execute({
      sql: 'SELECT id, nombre, tipo, url, creadoEn FROM EvidenciaReporte WHERE reporteId = ? ORDER BY datetime(creadoEn) DESC, id DESC',
      args: [id],
    }),
    db.execute({
      sql: `
        SELECT o.id, o.texto, o.creadoEn, u.id AS usuarioId, u.nombre AS usuario, u.rol
        FROM ObservacionReporte o
        INNER JOIN Usuario u ON u.id = o.usuarioId
        WHERE o.reporteId = ?
        ORDER BY datetime(o.creadoEn) DESC, o.id DESC
      `,
      args: [id],
    }),
  ]);

  let notificaciones: Array<Record<string, unknown>> = [];
  if (puedeGestionarRegistro(usuario, Number(reporte.docenteId))) {
    const [acudiente, institucional] = await Promise.all([
      db.execute({
        sql: `
          SELECT n.id, 'Acudiente' AS destinatarioTipo, a.nombre AS destinatario,
                 n.canal, n.asunto, n.leida, n.enviadoEn
          FROM Notificacion n
          INNER JOIN Acudiente a ON a.id = n.acudienteId
          WHERE n.reporteId = ? ORDER BY datetime(n.enviadoEn) DESC
        `,
        args: [id],
      }),
      db.execute({
        sql: `
          SELECT n.id, 'Personal institucional' AS destinatarioTipo, u.nombre AS destinatario,
                 n.canal, n.asunto, n.leida, n.enviadoEn
          FROM NotificacionUsuario n
          INNER JOIN Usuario u ON u.id = n.usuarioId
          WHERE n.reporteId = ? ORDER BY datetime(n.enviadoEn) DESC
        `,
        args: [id],
      }),
    ]);
    notificaciones = [...acudiente.rows, ...institucional.rows]
      .sort((a, b) => new Date(String(b.enviadoEn)).getTime() - new Date(String(a.enviadoEn)).getTime());
  }

  return {
    data: {
      ...reporte,
      evidencias: evidencias.rows,
      observacionesLista: observaciones.rows,
      notificaciones,
      permisos: {
        puedeEditar: reporte.docenteId === usuario.id && edicionVigente(reporte),
        puedeAgregarEvidencia: usuario.rol === 'Coordinador'
          || (reporte.docenteId === usuario.id && edicionVigente(reporte)),
        puedeObservar: puedeGestionarRegistro(usuario, Number(reporte.docenteId)),
        puedeGestionarEstado: usuario.rol === 'Coordinador',
      },
    },
  };
}

export async function crearReporte(input: ReporteInput, usuario: SesionUsuario) {
  const validacion = validarReporte(input);
  if ('error' in validacion) return validacion;
  const data = validacion.data;
  const estudiante = await db.execute({
    sql: 'SELECT id FROM Estudiante WHERE id = ? AND activo = 1 AND archivado = 0 LIMIT 1',
    args: [data.estudianteId],
  });
  if (!estudiante.rows[0]) return { error: 'El estudiante no existe o no se encuentra activo', status: 404 } as const;

  const editableHasta = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const transaction = await db.transaction('write');
  let reporte: Record<string, unknown>;
  try {
    const result = await transaction.execute({
      sql: `
        INSERT INTO Reporte (
          estudianteId, docenteId, tipoFalta, fechaHecho, lugar, situacion,
          descripcion, actuacionInicial, confidencial, evidenciaUrl, editableHasta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id, estudianteId, docenteId, tipoFalta, fechaHecho, lugar, situacion,
          descripcion, actuacionInicial, evidenciaUrl, observaciones, fecha, estado,
          confidencial, editableHasta, creadoEn, actualizadoEn
      `,
      args: [data.estudianteId, usuario.id, data.tipoFalta, data.fechaHecho, data.lugar,
        data.situacion, data.descripcion, data.actuacionInicial, data.confidencial,
        data.evidenciaUrl, editableHasta],
    });
    reporte = result.rows[0];
    if (data.evidenciaUrl) {
      await transaction.execute({
        sql: 'INSERT INTO EvidenciaReporte (reporteId, nombre, tipo, url) VALUES (?, ?, ?, ?)',
        args: [Number(reporte.id), 'Evidencia inicial', 'Enlace institucional', data.evidenciaUrl],
      });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }

  const reporteId = Number(reporte.id);
  const efectos = await Promise.allSettled([
    notificarAcudientePorReporte(reporteId),
    evaluarAlertaEstudiante(data.estudianteId, usuario),
    registrarAccion({
      usuarioId: usuario.id,
      accion: 'crear_reporte',
      entidad: 'Reporte',
      entidadId: reporteId,
      detalle: { estudianteId: data.estudianteId, tipoFalta: data.tipoFalta, confidencial: Boolean(data.confidencial) },
    }),
  ]);
  const nombres = ['notificación', 'evaluación de alertas', 'auditoría'];
  efectos.forEach((efecto, index) => {
    if (efecto.status === 'rejected') reportarEfectoFallido(nombres[index], efecto.reason);
  });

  return {
    data: {
      ...reporte,
      avisos: efectos.map((efecto, index) => efecto.status === 'rejected' ? `No se completó: ${nombres[index]}.` : null).filter(Boolean),
    },
    status: 201,
  };
}

export async function editarReporte(id: number, usuario: SesionUsuario, input: EdicionReporteInput) {
  const actual = await db.execute({
    sql: `SELECT docenteId, editableHasta, estado, fechaHecho, lugar, situacion,
                 descripcion, actuacionInicial, confidencial FROM Reporte WHERE id = ? LIMIT 1`,
    args: [id],
  });
  const row = actual.rows[0];
  if (!row) return { error: 'Reporte no encontrado', status: 404 } as const;
  if (Number(row.docenteId) !== usuario.id) return { error: 'Solo la persona que creó el reporte puede corregirlo', status: 403 } as const;
  if (!edicionVigente(row)) return { error: 'El reporte solo puede corregirse mientras esté pendiente y dentro de las primeras 24 horas', status: 403 } as const;

  const fechaHecho = validarFechaHecho(input.fechaHecho ?? (row.fechaHecho ? String(row.fechaHecho) : undefined));
  if (!fechaHecho) return { error: 'Indica una fecha válida del hecho', status: 400 } as const;
  const lugar = (input.lugar ?? String(row.lugar || '')).trim();
  const situacion = (input.situacion ?? String(row.situacion || '')).trim();
  const descripcion = (input.descripcion ?? String(row.descripcion || '')).trim();
  const actuacionInicial = (input.actuacionInicial ?? String(row.actuacionInicial || '')).trim();
  if (lugar.length < 3 || lugar.length > 120) return { error: 'El lugar debe tener entre 3 y 120 caracteres', status: 400 } as const;
  if (situacion.length < 3 || situacion.length > 220) return { error: 'La situación debe tener entre 3 y 220 caracteres', status: 400 } as const;
  if (descripcion.length < 20 || descripcion.length > 2000) return { error: 'La descripción debe tener entre 20 y 2000 caracteres', status: 400 } as const;
  if (actuacionInicial.length < 3 || actuacionInicial.length > 1000) return { error: 'La actuación inicial debe tener entre 3 y 1000 caracteres', status: 400 } as const;
  const confidencial = input.confidencial === undefined ? Number(row.confidencial) : input.confidencial ? 1 : 0;

  const result = await db.execute({
    sql: `
      UPDATE Reporte SET fechaHecho = ?, lugar = ?, situacion = ?, descripcion = ?,
        actuacionInicial = ?, confidencial = ?, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?
      RETURNING id, estudianteId, docenteId, tipoFalta, fechaHecho, lugar, situacion,
        descripcion, actuacionInicial, evidenciaUrl, observaciones, fecha, estado,
        confidencial, editableHasta, creadoEn, actualizadoEn
    `,
    args: [fechaHecho, lugar, situacion, descripcion, actuacionInicial, confidencial, id],
  });
  await registrarAccion({ usuarioId: usuario.id, accion: 'editar_reporte', entidad: 'Reporte', entidadId: id, detalle: { confidencial: Boolean(confidencial) } })
    .catch((error) => reportarEfectoFallido('auditoría de edición', error));
  return { data: result.rows[0] };
}

export async function agregarEvidenciaReporte(id: number, input: EvidenciaReporteInput, usuario: SesionUsuario) {
  const reporteResult = await db.execute({
    sql: 'SELECT id, docenteId, editableHasta, estado FROM Reporte WHERE id = ? LIMIT 1',
    args: [id],
  });
  const reporte = reporteResult.rows[0];
  if (!reporte) return { error: 'Reporte no encontrado', status: 404 } as const;
  if (usuario.rol !== 'Coordinador' && (Number(reporte.docenteId) !== usuario.id || !edicionVigente(reporte))) {
    return { error: 'No tienes permiso para agregar evidencias a este reporte', status: 403 } as const;
  }
  const nombre = input.nombre.trim();
  const tipo = input.tipo.trim();
  const url = input.url.trim();
  if (nombre.length < 2 || nombre.length > 120) return { error: 'El nombre de la evidencia debe tener entre 2 y 120 caracteres', status: 400 } as const;
  if (tipo.length < 2 || tipo.length > 80) return { error: 'Selecciona un tipo de evidencia válido', status: 400 } as const;
  if (!validarUrlHttp(url)) return { error: 'El enlace de evidencia debe ser una dirección HTTP o HTTPS válida', status: 400 } as const;

  const results = await db.batch([
    { sql: 'INSERT INTO EvidenciaReporte (reporteId, nombre, tipo, url) VALUES (?, ?, ?, ?) RETURNING id, reporteId, nombre, tipo, url, creadoEn', args: [id, nombre, tipo, url] },
    { sql: 'UPDATE Reporte SET evidenciaUrl = COALESCE(evidenciaUrl, ?), actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?', args: [url, id] },
  ], 'write');
  const evidencia = results[0].rows[0];
  await registrarAccion({ usuarioId: usuario.id, accion: 'agregar_evidencia_reporte', entidad: 'EvidenciaReporte', entidadId: Number(evidencia.id), detalle: { reporteId: id, tipo } })
    .catch((error) => reportarEfectoFallido('auditoría de evidencia', error));
  return { data: evidencia, status: 201 };
}

export async function agregarObservacionReporte(id: number, texto: string, usuario: SesionUsuario) {
  const reporteResult = await db.execute({ sql: 'SELECT id, docenteId FROM Reporte WHERE id = ? LIMIT 1', args: [id] });
  const reporte = reporteResult.rows[0];
  if (!reporte) return { error: 'Reporte no encontrado', status: 404 } as const;
  if (!puedeGestionarRegistro(usuario, Number(reporte.docenteId))) return { error: 'No tienes permiso para agregar observaciones a este reporte', status: 403 } as const;
  const textoLimpio = texto.trim();
  if (textoLimpio.length < 4 || textoLimpio.length > 1500) return { error: 'La observación debe tener entre 4 y 1500 caracteres', status: 400 } as const;

  const results = await db.batch([
    { sql: 'INSERT INTO ObservacionReporte (reporteId, usuarioId, texto) VALUES (?, ?, ?) RETURNING id, reporteId, usuarioId, texto, creadoEn', args: [id, usuario.id, textoLimpio] },
    { sql: 'UPDATE Reporte SET observaciones = ?, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?', args: [textoLimpio, id] },
  ], 'write');
  await registrarAccion({ usuarioId: usuario.id, accion: 'agregar_observacion_reporte', entidad: 'ObservacionReporte', entidadId: Number(results[0].rows[0].id), detalle: { reporteId: id } })
    .catch((error) => reportarEfectoFallido('auditoría de observación', error));
  return { data: { ...results[0].rows[0], usuario: usuario.nombre, rol: usuario.rol }, status: 201 };
}

export async function cambiarEstadoReporte(id: number, estado: string, observaciones: string | undefined, usuario: SesionUsuario) {
  if (usuario.rol !== 'Coordinador') {
    return { error: 'Solo coordinación puede gestionar el estado de un reporte', status: 403 } as const;
  }
  const estadoLimpio = estado.trim();
  if (!ESTADOS_REPORTE.includes(estadoLimpio as (typeof ESTADOS_REPORTE)[number])) return { error: 'Selecciona un estado válido', status: 400 } as const;
  const actualResult = await db.execute({ sql: 'SELECT id, estudianteId, estado FROM Reporte WHERE id = ? LIMIT 1', args: [id] });
  const actual = actualResult.rows[0];
  if (!actual) return { error: 'Reporte no encontrado', status: 404 } as const;
  const estadoActual = String(actual.estado);
  if (estadoActual !== estadoLimpio && !TRANSICIONES_REPORTE[estadoActual]?.includes(estadoLimpio)) {
    return { error: `No es posible cambiar un reporte de ${estadoActual} a ${estadoLimpio}`, status: 409 } as const;
  }
  const observacion = observaciones?.trim() || '';
  if ((estadoLimpio === 'Cerrado' || estadoLimpio === 'Anulado') && observacion.length < 10) {
    return { error: `Registra una justificación de al menos 10 caracteres para marcar el reporte como ${estadoLimpio.toLowerCase()}`, status: 400 } as const;
  }
  if (observacion.length > 1500) return { error: 'La observación no puede superar 1500 caracteres', status: 400 } as const;

  const statements: Array<{ sql: string; args: Array<string | number | null> }> = [{
    sql: `UPDATE Reporte SET estado = ?, observaciones = COALESCE(?, observaciones), actualizadoEn = CURRENT_TIMESTAMP
      WHERE id = ? RETURNING id, estudianteId, docenteId, tipoFalta, fechaHecho, lugar, situacion,
      descripcion, actuacionInicial, evidenciaUrl, observaciones, fecha, estado, confidencial,
      editableHasta, creadoEn, actualizadoEn`,
    args: [estadoLimpio, observacion || null, id],
  }];
  if (observacion) statements.push({ sql: 'INSERT INTO ObservacionReporte (reporteId, usuarioId, texto) VALUES (?, ?, ?)', args: [id, usuario.id, observacion] });
  const results = await db.batch(statements, 'write');
  const reporte = results[0].rows[0];

  const efectos = await Promise.allSettled([
    registrarAccion({ usuarioId: usuario.id, accion: 'cambiar_estado_reporte', entidad: 'Reporte', entidadId: id, detalle: { estadoAnterior: estadoActual, estado: estadoLimpio, observaciones: observacion || null } }),
    estadoActual === estadoLimpio ? Promise.resolve() : notificarAcudienteCambioReporte(id, estadoLimpio),
  ]);
  efectos.forEach((efecto, index) => {
    if (efecto.status === 'rejected') reportarEfectoFallido(index === 0 ? 'auditoría' : 'notificación de estado', efecto.reason);
  });
  return { data: reporte };
}

function validarConvivencia(input: ConvivenciaInput) {
  const tipoNormalizado = normalizarTipoSituacion(input.tipo);
  if (!tipoNormalizado) return { error: 'Selecciona una situación Tipo I, Tipo II o Tipo III', status: 400 } as const;
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
  if (!data.estudianteId || !data.estudiante || !data.grado) return { error: 'Los datos del estudiante son obligatorios', status: 400 } as const;
  if (!data.descripcion || !data.etapa || !data.competencia) return { error: 'Completa los datos del reporte de convivencia', status: 400 } as const;
  if (!data.notificacionAcudiente) return { error: 'Indica cómo se notificó al acudiente', status: 400 } as const;
  return { data };
}

export async function listarConvivencia() {
  const result = await db.execute('SELECT * FROM ConvivenciaReporte ORDER BY creadoEn DESC');
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
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING *
    `,
    args: [id, data.estudianteId, data.estudiante, data.grado, data.tipo, data.descripcion,
      data.etapa, data.competencia, data.notificacionAcudiente, data.requiereSiuce,
      usuario.id, usuario.nombre, usuario.rol, data.evidencia],
  });
  await registrarAccion({ usuarioId: usuario.id, accion: 'activar_ruta_convivencia', entidad: 'ConvivenciaReporte', entidadId: id, detalle: { estudianteId: data.estudianteId, tipo: data.tipo, requiereSiuce: Boolean(data.requiereSiuce) } });
  return { data: result.rows[0], status: 201 };
}
