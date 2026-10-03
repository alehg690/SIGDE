import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import { obtenerValorConfiguracion } from '@backend/services/configuracion.service';
import {
  ALERT_PROMPT_VERSION,
  ALERT_RULE_ID,
  ALERT_RULES_VERSION,
  calcularNivelAtencion,
  construirResumenCorto,
  crearHuellaAnalisis,
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
    sql: `SELECT id, tipoFalta, COALESCE(fechaHecho, fecha, creadoEn) AS fecha, situacion, estado, confidencial
      FROM Reporte WHERE estudianteId = ? AND estado <> 'Anulado' AND tipoFalta <> 'ACADEMICA'
      AND datetime(COALESCE(fechaHecho, fecha, creadoEn)) >= datetime(?)
      ORDER BY datetime(COALESCE(fechaHecho, fecha, creadoEn)) ASC, id ASC`,
    args: [estudianteId, periodoInicio],
  });
  return result.rows as EvidenceRow[];
}

function snapshotEvidence(rows: EvidenceRow[]) {
  return rows.map((row) => ({
    reportId: Number(row.id), type: String(row.tipoFalta), occurredAt: String(row.fecha),
    category: row.situacion ? String(row.situacion) : null, confidential: Boolean(row.confidencial),
  }));
}

function extractResponseText(body: Record<string, unknown>) {
  const output = Array.isArray(body.output) ? body.output : [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    const rawContent = (item as Record<string, unknown>).content;
    const content = Array.isArray(rawContent) ? rawContent as Array<Record<string, unknown>> : [];
    const text = content.find((part) => part.type === 'output_text' && typeof part.text === 'string')?.text;
    if (text) return String(text);
  }
  return null;
}

function validarAnalisis(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const item = value as Record<string, unknown>;
  const stringArray = (key: string) => Array.isArray(item[key]) && (item[key] as unknown[]).every((entry) => typeof entry === 'string');
  if (typeof item.summary !== 'string' || !stringArray('hypotheses') || !stringArray('suggestedActions')
    || !stringArray('positiveSignals') || !stringArray('missingInformation') || typeof item.confidence !== 'number') return null;
  return {
    summary: item.summary.slice(0, 1200), hypotheses: (item.hypotheses as string[]).slice(0, 5),
    suggestedActions: (item.suggestedActions as string[]).slice(0, 6), positiveSignals: (item.positiveSignals as string[]).slice(0, 5),
    missingInformation: (item.missingInformation as string[]).slice(0, 5), confidence: Math.max(0, Math.min(1, item.confidence)),
  };
}

async function solicitarAnalisisIa(input: { studentRef: string; total: number; periodoDias: number; evidence: unknown[] }) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = process.env.OPENAI_ALERTS_MODEL?.trim() || 'gpt-6-astra';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, signal: controller.signal,
      body: JSON.stringify({
        model, store: false,
        instructions: `Eres un asistente de apoyo escolar. Analiza solo el patrón objetivo. No diagnostiques, no afirmes causas y no identifiques al estudiante. Marca toda explicación como hipótesis prudente. Sugiere solo revisión o acompañamiento humano. Responde en español. Versión: ${ALERT_PROMPT_VERSION}.`,
        input: JSON.stringify(input),
        text: { format: { type: 'json_schema', name: 'student_alert_analysis', strict: true, schema: {
          type: 'object', properties: {
            summary: { type: 'string' }, hypotheses: { type: 'array', items: { type: 'string' } },
            suggestedActions: { type: 'array', items: { type: 'string' } }, positiveSignals: { type: 'array', items: { type: 'string' } },
            missingInformation: { type: 'array', items: { type: 'string' } }, confidence: { type: 'number', minimum: 0, maximum: 1 },
          }, required: ['summary', 'hypotheses', 'suggestedActions', 'positiveSignals', 'missingInformation', 'confidence'], additionalProperties: false,
        } } },
      }),
    });
    if (!response.ok) throw new Error(`OpenAI respondió ${response.status}`);
    const body = await response.json() as Record<string, unknown>;
    const outputText = extractResponseText(body);
    if (!outputText) throw new Error('OpenAI no devolvió contenido estructurado');
    const analysis = validarAnalisis(JSON.parse(outputText));
    if (!analysis) throw new Error('El análisis de OpenAI no cumple el esquema esperado');
    return analysis;
  } finally { clearTimeout(timer); }
}

async function enriquecerAlerta(alertaId: number, estudianteId: number, total: number, periodoDias: number, evidence: unknown[], fingerprint: string, auditUserId: number) {
  try {
    const analysis = await solicitarAnalisisIa({ studentRef: `student:${estudianteId}`, total, periodoDias, evidence });
    if (!analysis) return;
    await db.execute({
      sql: `UPDATE Alerta SET analisisIaJson = ?, confianza = ?, versionPrompt = ?, analisisGeneradoEn = CURRENT_TIMESTAMP,
        huellaAnalisis = ?, origen = 'rule+ai', actualizadoEn = CURRENT_TIMESTAMP WHERE id = ?`,
      args: [JSON.stringify(analysis), analysis.confidence, ALERT_PROMPT_VERSION, fingerprint, alertaId],
    });
    await registrarAccion({ usuarioId: auditUserId, accion: 'enriquecer_alerta_ia', entidad: 'Alerta', entidadId: alertaId, detalle: { promptVersion: ALERT_PROMPT_VERSION, confidence: analysis.confidence } });
  } catch (error) { logServerError('student_alert_ai_analysis_failed', error); }
}

export async function evaluarAlertaEstudiante(estudianteId: number, usuario: SesionUsuario) {
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
  if (requiereNuevoAnalisis(actual?.huellaAnalisis, actual?.analisisIaJson, fingerprint)) await enriquecerAlerta(alertaId, estudianteId, total, periodoDias, evidence, fingerprint, usuario.id);
  return { data: { id: alertaId, cantidadReportes: total, estado: actual?.estado || 'new' } };
}

export async function listarAlertas(usuario: SesionUsuario, filters: AlertFilters = {}) {
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
    const evidence = parseJson(alert.evidenciaJson, []) as unknown[];
    const periodoDias = Number(await obtenerValorConfiguracion('alertas.periodoDias', '30'));
    const fingerprint = `${crearHuellaAnalisis({ ruleId: alert.ruleId, evidence, regeneratedAt: Date.now() })}:manual`;
    await enriquecerAlerta(id, Number(alert.estudianteId), Number(alert.cantidadReportes), periodoDias, evidence, fingerprint, usuario.id);
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
