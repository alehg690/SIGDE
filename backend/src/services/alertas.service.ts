import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import { obtenerValorConfiguracion } from '@backend/services/configuracion.service';
import {
  ALERT_ANALYSIS_VERSION,
  ALERT_RULE_ID,
  ALERT_RULES_VERSION,
  calcularNivelAtencion,
  construirResumenCorto,
  crearHuellaAnalisis,
  generarAnalisisLocal,
  type LocalAlertEvidence,
  requiereNuevoAnalisis,
} from '@backend/services/alertas.rules';
import { esRolCoordinador, type SesionUsuario } from '@backend/types/roles';
import { logServerError } from '@backend/utils/logger';

const ACTIVE_STATUSES = ['new', 'reviewed', 'monitoring'] as const;
const ALL_STATUSES = [...ACTIVE_STATUSES, 'resolved', 'dismissed'] as const;
const ATTENTION_LEVELS = ['informational', 'low', 'medium', 'high'] as const;
type AlertStatus = (typeof ALL_STATUSES)[number];
type AlertAction = 'review' | 'confirm' | 'correct' | 'dismiss' | 'close' | 'regenerate';
type EvidenceRow = Record<string, unknown>;
type AlertFilters = { historial?: boolean; busqueda?: string; estado?: string; nivel?: string; regla?: string; curso?: string; desde?: string; hasta?: string };
const EVIDENCE_COLUMNS = `r.id, r.tipoFalta, COALESCE(r.fechaHecho, r.fecha, r.creadoEn) AS fecha,
  r.situacion, r.descripcion, r.lugar, r.actuacionInicial, r.estado, r.confidencial`;

function scopeClause(usuario: SesionUsuario, studentAlias = 'e') {
  if (esRolCoordinador(usuario.rol)) return { sql: '1 = 1', args: [] as Array<string | number> };
  return {
    sql: `(
      EXISTS (SELECT 1 FROM Reporte alcance_r WHERE alcance_r.estudianteId = ${studentAlias}.id AND alcance_r.docenteId = ?)
      OR EXISTS (SELECT 1 FROM GrupoEscolar alcance_g WHERE alcance_g.directorId = ?
        AND alcance_g.grado = REPLACE(${studentAlias}.grado, '°', '') AND alcance_g.grupo = ${studentAlias}.grupo)
    )`,
    args: [usuario.id, usuario.id],
  };
}

function parseJson(value: unknown, fallback: unknown) {
  if (!value) return fallback;
  try { return JSON.parse(String(value)); } catch { return fallback; }
}

function periodStart(periodoDias: number) {
  return new Date(Date.now() - periodoDias * 24 * 60 * 60 * 1000).toISOString();
}

function safeDate(value: string | undefined, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}-05:00`;
}

async function obtenerEvidencias(estudianteId: number, periodoInicio: string) {
  const result = await db.execute({
    sql: `SELECT ${EVIDENCE_COLUMNS} FROM Reporte r
      WHERE r.estudianteId = ? AND r.estado <> 'Anulado' AND r.tipoFalta <> 'ACADEMICA'
      AND datetime(COALESCE(r.fechaHecho, r.fecha, r.creadoEn)) >= datetime(?)
      ORDER BY datetime(COALESCE(r.fechaHecho, r.fecha, r.creadoEn)) ASC, r.id ASC`,
    args: [estudianteId, periodoInicio],
  });
  return result.rows as EvidenceRow[];
}

async function obtenerEvidenciasDeAlerta(alert: Record<string, unknown>) {
  const alertId = Number(alert.id);
  const linked = await db.execute({
    sql: `SELECT ${EVIDENCE_COLUMNS} FROM AlertaEvidencia ae
      INNER JOIN Reporte r ON r.id = ae.reporteId
      WHERE ae.alertaId = ? AND r.estado <> 'Anulado' AND r.tipoFalta <> 'ACADEMICA'
      ORDER BY datetime(COALESCE(r.fechaHecho, r.fecha, r.creadoEn)) ASC, r.id ASC`,
    args: [alertId],
  });
  if (linked.rows.length) return linked.rows as EvidenceRow[];

  const conditions = [`r.estudianteId = ?`, `r.estado <> 'Anulado'`, `r.tipoFalta <> 'ACADEMICA'`];
  const args: Array<string | number> = [Number(alert.estudianteId)];
  if (alert.periodoInicio) { conditions.push('datetime(COALESCE(r.fechaHecho, r.fecha, r.creadoEn)) >= datetime(?)'); args.push(String(alert.periodoInicio)); }
  if (alert.periodoFin) { conditions.push('datetime(COALESCE(r.fechaHecho, r.fecha, r.creadoEn)) <= datetime(?)'); args.push(String(alert.periodoFin)); }
  args.push(Math.max(Number(alert.cantidadReportes) || 0, 1));
  const historical = await db.execute({
    sql: `SELECT * FROM (SELECT ${EVIDENCE_COLUMNS} FROM Reporte r WHERE ${conditions.join(' AND ')}
      ORDER BY datetime(COALESCE(r.fechaHecho, r.fecha, r.creadoEn)) DESC, r.id DESC LIMIT ?)
      ORDER BY datetime(fecha) ASC, id ASC`,
    args,
  });
  return historical.rows as EvidenceRow[];
}

function snapshotEvidence(rows: EvidenceRow[]) {
  return rows.map((row) => ({
    reportId: Number(row.id), type: String(row.tipoFalta), occurredAt: String(row.fecha),
    category: row.situacion ? String(row.situacion) : null,
    description: row.descripcion ? String(row.descripcion) : null,
    place: row.lugar ? String(row.lugar) : null,
    initialAction: row.actuacionInicial ? String(row.actuacionInicial) : null,
    confidential: Boolean(row.confidencial),
  }));
}

async function enriquecerAlertaLocal(alertaId: number, total: number, periodoDias: number, evidence: LocalAlertEvidence[], fingerprint: string, auditUserId: number) {
  try {
    const analysis = generarAnalisisLocal({ total, periodoDias, evidence });
    await db.execute({
      sql: `UPDATE Alerta SET analisisIaJson = ?, confianza = ?, versionPrompt = ?, analisisGeneradoEn = CURRENT_TIMESTAMP,
        huellaAnalisis = ?, origen = 'rule+local', actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [JSON.stringify(analysis), analysis.confidence, ALERT_ANALYSIS_VERSION, fingerprint, alertaId],
    });
    await registrarAccion({ usuarioId: auditUserId, accion: 'enriquecer_alerta_local', entidad: 'Alerta', entidadId: alertaId, detalle: { analysisVersion: ALERT_ANALYSIS_VERSION, confidence: analysis.confidence } });
  } catch (error) { logServerError('student_alert_local_analysis_failed', error); }
}

async function analizarAlertaExistente(alert: Record<string, unknown>, usuario: SesionUsuario) {
  const rows = await obtenerEvidenciasDeAlerta(alert);
  if (!rows.length) return false;
  const evidence = snapshotEvidence(rows);
  const total = evidence.length;
  const periodoDias = Number(await obtenerValorConfiguracion('alertas.periodoDias', '30'));
  const fingerprint = crearHuellaAnalisis({ ruleId: alert.ruleId, version: ALERT_RULES_VERSION, total, evidence });
  const alertaId = Number(alert.id);
  const transaction = await db.transaction('write');
  try {
    await transaction.execute({
      sql: `UPDATE Alerta SET cantidadReportes = ?, evidenciaJson = ?, versionReglas = ? WHERE id = ?`,
      args: [total, JSON.stringify(evidence), ALERT_RULES_VERSION, alertaId],
    });
    await transaction.execute({ sql: 'DELETE FROM AlertaEvidencia WHERE alertaId = ?', args: [alertaId] });
    for (const row of evidence) await transaction.execute({
      sql: `INSERT INTO AlertaEvidencia (alertaId, reporteId, tipoEvidencia, instantaneaJson)
        VALUES (?, ?, 'reporte', ?)`,
      args: [alertaId, Number(row.reportId), JSON.stringify(row)],
    });
    await transaction.commit();
  } catch (error) { await transaction.rollback(); throw error; }
  await enriquecerAlertaLocal(alertaId, total, periodoDias, evidence, fingerprint, usuario.id);
  return true;
}

async function sincronizarAnalisisPendientes(usuario: SesionUsuario) {
  const scope = scopeClause(usuario);
  const pending = await db.execute({
    sql: `SELECT a.* FROM Alerta a INNER JOIN Estudiante e ON e.id = a.estudianteId
      WHERE ${scope.sql} AND (a.analisisIaJson IS NULL OR a.versionPrompt IS NULL)
      ORDER BY datetime(a.actualizadoEn) DESC LIMIT 50`,
    args: scope.args,
  });
  for (const alert of pending.rows) {
    try { await analizarAlertaExistente(alert as Record<string, unknown>, usuario); }
    catch (error) { logServerError(`student_alert_pending_analysis_failed:${Number(alert.id)}`, error); }
  }
}

export async function evaluarAlertaEstudiante(estudianteId: number, usuario: SesionUsuario, forzarAnalisis = false) {
  const alertasHabilitadas = await obtenerValorConfiguracion('alertas.habilitadas', 'true');
  if (alertasHabilitadas !== 'true') return { data: null };
  const umbral = Number(await obtenerValorConfiguracion('alertas.umbralReportes', '3'));
  const periodoDias = Number(await obtenerValorConfiguracion('alertas.periodoDias', '30'));
  const inicio = periodStart(periodoDias);
  const fin = new Date().toISOString();
  const evidencias = await obtenerEvidencias(estudianteId, inicio);
  const total = evidencias.length;
  const latest = await db.execute({ sql: `SELECT * FROM Alerta WHERE estudianteId = ? AND ruleId = ? ORDER BY id DESC LIMIT 1`, args: [estudianteId, ALERT_RULE_ID] });
  const previous = latest.rows[0];
  const actual = previous && ACTIVE_STATUSES.includes(String(previous.estado) as (typeof ACTIVE_STATUSES)[number]) ? previous : undefined;
  if (total < umbral) {
    if (!actual) return { data: null };
    const alertId = Number(actual.id);
    const reason = `El patrón dejó de cumplirse: ${total} de ${umbral} registros requeridos en ${periodoDias} días.`;
    await db.batch([
      { sql: `UPDATE Alerta SET estado = 'resolved', resueltoEn = CURRENT_TIMESTAMP, notaResolucion = ?, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?`, args: [reason, alertId] },
      { sql: `INSERT INTO AlertaHistorial (alertaId, estadoAnterior, estadoNuevo, motivo, usuarioId, proceso) VALUES (?, ?, 'resolved', ?, ?, 'rules-engine')`, args: [alertId, String(actual.estado), reason, usuario.id] },
    ], 'write');
    await registrarAccion({ usuarioId: usuario.id, accion: 'resolver_alerta_regla', entidad: 'Alerta', entidadId: alertId, detalle: { estudianteId, ruleId: ALERT_RULE_ID, total, umbral, periodoDias } });
    return { data: { id: alertId, estado: 'resolved' } };
  }

  const evidence = snapshotEvidence(evidencias);
  const fingerprint = crearHuellaAnalisis({ ruleId: ALERT_RULE_ID, version: ALERT_RULES_VERSION, total, evidence });
  if (!actual && previous && ['resolved', 'dismissed'].includes(String(previous.estado))
    && JSON.stringify(parseJson(previous.evidenciaJson, [])) === JSON.stringify(evidence)
    && String(previous.versionReglas || '') === ALERT_RULES_VERSION) {
    return { data: { id: Number(previous.id), cantidadReportes: total, estado: previous.estado } };
  }
  const level = calcularNivelAtencion(total, umbral);
  const summary = construirResumenCorto(total, periodoDias);
  let alertaId = actual ? Number(actual.id) : 0;
  const transaction = await db.transaction('write');
  try {
    if (actual) {
      await transaction.execute({ sql: `UPDATE Alerta SET cantidadReportes = ?, titulo = 'Reincidencia de reportes', resumenCorto = ?, nivelAtencion = ?, periodoInicio = ?, periodoFin = ?, evidenciaJson = ?, ultimoDetectadoEn = CURRENT_TIMESTAMP, versionReglas = ?, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?`, args: [total, summary, level, inicio, fin, JSON.stringify(evidence), ALERT_RULES_VERSION, alertaId] });
      await transaction.execute({ sql: 'DELETE FROM AlertaEvidencia WHERE alertaId = ?', args: [alertaId] });
    } else {
      const inserted = await transaction.execute({ sql: `INSERT INTO Alerta (estudianteId, ruleId, tipo, titulo, resumenCorto, cantidadReportes, estado, nivelAtencion, periodoInicio, periodoFin, evidenciaJson, versionReglas, origen, notas, primerDetectadoEn, ultimoDetectadoEn) VALUES (?, ?, 'reincidencia_reportes', 'Reincidencia de reportes', ?, ?, 'new', ?, ?, ?, ?, ?, 'rule', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) RETURNING id`, args: [estudianteId, ALERT_RULE_ID, summary, total, level, inicio, fin, JSON.stringify(evidence), ALERT_RULES_VERSION, `Regla activada: ${total} reportes en ${periodoDias} días.`] });
      alertaId = Number(inserted.rows[0].id);
      await transaction.execute({ sql: `INSERT INTO AlertaHistorial (alertaId, estadoAnterior, estadoNuevo, motivo, usuarioId, proceso) VALUES (?, NULL, 'new', ?, ?, 'rules-engine')`, args: [alertaId, `Regla ${ALERT_RULE_ID} activada`, usuario.id] });
    }
    for (const row of evidence) await transaction.execute({ sql: `INSERT INTO AlertaEvidencia (alertaId, reporteId, tipoEvidencia, instantaneaJson) VALUES (?, ?, 'reporte', ?)`, args: [alertaId, Number(row.reportId), JSON.stringify(row)] });
    await transaction.commit();
  } catch (error) { await transaction.rollback(); throw error; }

  if (!actual) await registrarAccion({ usuarioId: usuario.id, accion: 'crear_alerta_regla', entidad: 'Alerta', entidadId: alertaId, detalle: { estudianteId, ruleId: ALERT_RULE_ID, total, umbral, periodoDias } });
  if (forzarAnalisis || requiereNuevoAnalisis(actual?.huellaAnalisis, actual?.analisisIaJson, fingerprint)) await enriquecerAlertaLocal(alertaId, total, periodoDias, evidence, fingerprint, usuario.id);
  return { data: { id: alertaId, cantidadReportes: total, estado: actual?.estado || 'new' } };
}

export async function listarAlertas(usuario: SesionUsuario, filters: AlertFilters = {}) {
  await sincronizarAnalisisPendientes(usuario);
  const scope = scopeClause(usuario);
  const conditions = [scope.sql];
  const args: Array<string | number> = [...scope.args];
  if (!filters.historial) conditions.push("a.estado IN ('new', 'reviewed', 'monitoring')");
  if (filters.busqueda?.trim()) { conditions.push("(LOWER(e.nombre) LIKE LOWER(?) OR LOWER(e.grado || '-' || e.grupo) LIKE LOWER(?))"); const query = `%${filters.busqueda.trim()}%`; args.push(query, query); }
  if (filters.estado && ALL_STATUSES.includes(filters.estado as AlertStatus)) { conditions.push('a.estado = ?'); args.push(filters.estado); }
  if (filters.nivel && ATTENTION_LEVELS.includes(filters.nivel as (typeof ATTENTION_LEVELS)[number])) { conditions.push('a.nivelAtencion = ?'); args.push(filters.nivel); }
  if (filters.regla?.trim()) { conditions.push('a.ruleId = ?'); args.push(filters.regla.trim()); }
  if (filters.curso?.trim()) { conditions.push("LOWER(e.grado || '-' || e.grupo) LIKE LOWER(?)"); args.push(`%${filters.curso.trim()}%`); }
  const desde = safeDate(filters.desde); if (desde) { conditions.push('datetime(a.actualizadoEn) >= datetime(?)'); args.push(desde); }
  const hasta = safeDate(filters.hasta, true); if (hasta) { conditions.push('datetime(a.actualizadoEn) <= datetime(?)'); args.push(hasta); }
  const result = await db.execute({
    sql: `SELECT a.id, a.estudianteId, a.ruleId, a.tipo, a.titulo, a.resumenCorto, a.cantidadReportes, a.estado, a.nivelAtencion, a.confianza, a.periodoInicio, a.periodoFin, a.origen, a.primerDetectadoEn, a.ultimoDetectadoEn, a.revisadoEn, a.resueltoEn, a.creadoEn, a.actualizadoEn, e.nombre AS estudiante, e.grado, e.grupo FROM Alerta a INNER JOIN Estudiante e ON e.id = a.estudianteId WHERE ${conditions.join(' AND ')} ORDER BY CASE a.estado WHEN 'new' THEN 0 WHEN 'reviewed' THEN 1 WHEN 'monitoring' THEN 2 ELSE 3 END, CASE a.nivelAtencion WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END, datetime(a.actualizadoEn) DESC LIMIT 500`,
    args,
  });
  return { data: result.rows };
}

export async function listarAlertasActivas(incluirResueltas = false, usuario?: SesionUsuario) {
  if (!usuario) throw new Error('Se requiere el usuario para aplicar el alcance de alertas');
  return listarAlertas(usuario, { historial: incluirResueltas });
}

export async function obtenerDetalleAlerta(id: number, usuario: SesionUsuario) {
  const scope = scopeClause(usuario);
  const result = await db.execute({ sql: `SELECT a.*, e.nombre AS estudiante, e.grado, e.grupo, u.nombre AS revisadoPor FROM Alerta a INNER JOIN Estudiante e ON e.id = a.estudianteId LEFT JOIN Usuario u ON u.id = a.revisadoPorId WHERE a.id = ? AND ${scope.sql} LIMIT 1`, args: [id, ...scope.args] });
  const alert = result.rows[0];
  if (!alert) return { error: 'Alerta no encontrada', status: 404 } as const;
  const [evidence, history] = await Promise.all([
    db.execute({ sql: `SELECT ae.id, ae.tipoEvidencia, ae.reporteId, ae.instantaneaJson, ae.creadoEn, r.tipoFalta, COALESCE(r.fechaHecho, r.fecha, r.creadoEn) AS fecha, r.situacion, r.estado FROM AlertaEvidencia ae LEFT JOIN Reporte r ON r.id = ae.reporteId WHERE ae.alertaId = ? ORDER BY datetime(COALESCE(r.fechaHecho, r.fecha, r.creadoEn)) DESC`, args: [id] }),
    db.execute({ sql: `SELECT h.id, h.estadoAnterior, h.estadoNuevo, h.motivo, h.proceso, h.creadoEn, u.nombre AS usuario FROM AlertaHistorial h LEFT JOIN Usuario u ON u.id = h.usuarioId WHERE h.alertaId = ? ORDER BY datetime(h.creadoEn) DESC, h.id DESC`, args: [id] }),
  ]);
  return { data: { ...alert, evidencia: evidence.rows.map((row) => ({ ...row, snapshot: parseJson(row.instantaneaJson, null) })), analisisIa: parseJson(alert.analisisIaJson, null), historial: history.rows } };
}

function transitionForAction(action: AlertAction): AlertStatus | null {
  if (action === 'review') return 'reviewed';
  if (action === 'confirm' || action === 'correct') return 'monitoring';
  if (action === 'dismiss') return 'dismissed';
  if (action === 'close') return 'resolved';
  return null;
}

export async function actuarSobreAlerta(id: number, action: AlertAction, note: string | undefined, usuario: SesionUsuario) {
  const detail = await obtenerDetalleAlerta(id, usuario);
  if ('error' in detail) return detail;
  const alertRecord = detail.data as unknown as Record<string, unknown>;
  if (!esRolCoordinador(usuario.rol)) return { error: 'Solo coordinación puede modificar alertas', status: 403 } as const;
  if (action === 'regenerate') {
    const alert = alertRecord;
    await analizarAlertaExistente(alert, usuario);
    await registrarAccion({ usuarioId: usuario.id, accion: 'regenerar_analisis_alerta', entidad: 'Alerta', entidadId: id, detalle: { ruleId: alert.ruleId } });
    return obtenerDetalleAlerta(id, usuario);
  }
  const nextStatus = transitionForAction(action);
  if (!nextStatus) return { error: 'Acción de alerta no válida', status: 400 } as const;
  const cleanNote = note?.trim() || '';
  if (['correct', 'dismiss', 'close'].includes(action) && cleanNote.length < 10) return { error: 'Registra un motivo de al menos 10 caracteres', status: 400 } as const;
  if (cleanNote.length > 1500) return { error: 'El motivo no puede superar 1500 caracteres', status: 400 } as const;
  const previousStatus = String(alertRecord.estado);
  await db.batch([
    { sql: `UPDATE Alerta SET estado = ?, notas = COALESCE(?, notas), revisadoEn = CASE WHEN ? IN ('reviewed', 'monitoring') THEN CURRENT_TIMESTAMP ELSE revisadoEn END, revisadoPorId = CASE WHEN ? IN ('reviewed', 'monitoring') THEN ? ELSE revisadoPorId END, resueltoEn = CASE WHEN ? IN ('resolved', 'dismissed') THEN CURRENT_TIMESTAMP ELSE NULL END, notaResolucion = CASE WHEN ? IN ('resolved', 'dismissed') THEN ? ELSE notaResolucion END, actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?`, args: [nextStatus, cleanNote || null, nextStatus, nextStatus, usuario.id, nextStatus, nextStatus, cleanNote || null, id] },
    { sql: `INSERT INTO AlertaHistorial (alertaId, estadoAnterior, estadoNuevo, motivo, usuarioId, proceso) VALUES (?, ?, ?, ?, ?, 'human-review')`, args: [id, previousStatus, nextStatus, cleanNote || `Acción: ${action}`, usuario.id] },
  ], 'write');
  await registrarAccion({ usuarioId: usuario.id, accion: `alerta_${action}`, entidad: 'Alerta', entidadId: id, detalle: { estadoAnterior: previousStatus, estado: nextStatus, motivo: cleanNote || null } });
  return obtenerDetalleAlerta(id, usuario);
}

export async function marcarAlerta(id: number, estado: string, notas: string | undefined, usuario: SesionUsuario) {
  const legacyAction: Record<string, AlertAction> = { activa: 'review', en_seguimiento: 'confirm', resuelta: 'close', reviewed: 'review', monitoring: 'confirm', resolved: 'close', dismissed: 'dismiss' };
  const action = legacyAction[estado];
  if (!action) return { error: 'Estado de alerta no válido', status: 400 } as const;
  return actuarSobreAlerta(id, action, notas, usuario);
}

export async function escalarAlerta(id: number, usuario: SesionUsuario) {
  return actuarSobreAlerta(id, 'confirm', 'Confirmada para seguimiento institucional.', usuario);
}
