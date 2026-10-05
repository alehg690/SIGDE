import { createHash } from 'node:crypto';

export const ALERT_RULE_ID = 'REPORT_RECURRENCE_30D';
export const ALERT_RULES_VERSION = 'report-recurrence-v3';
export const ALERT_ANALYSIS_VERSION = 'sigde-local-analysis-v1';

export type AttentionLevel = 'informational' | 'low' | 'medium' | 'high';
export type LocalAlertEvidence = {
  reportId: number;
  type: string;
  occurredAt: string;
  category?: string | null;
  description?: string | null;
  place?: string | null;
  initialAction?: string | null;
  confidential?: boolean;
};
export type LocalAlertAnalysis = {
  summary: string;
  hypotheses: string[];
  suggestedActions: string[];
  positiveSignals: string[];
  missingInformation: string[];
  confidence: number;
  patterns: {
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    byPlace: Array<{ place: string; total: number }>;
    recentSevenDays: number;
  };
};

export function calcularNivelAtencion(total: number, umbral: number): AttentionLevel {
  if (total >= umbral + 2) return 'high';
  if (total >= umbral) return 'medium';
  return total > 0 ? 'low' : 'informational';
}

export function construirResumenCorto(total: number, periodoDias: number) {
  return `${total} ${total === 1 ? 'reporte' : 'reportes'} en los últimos ${periodoDias} días`;
}

export function crearHuellaAnalisis(input: unknown) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

export function requiereNuevoAnalisis(huellaAnterior: unknown, analisisAnterior: unknown, huellaActual: string) {
  return !analisisAnterior || String(huellaAnterior || '') !== huellaActual;
}

function normalizar(value: unknown) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function cuentaCoincidencias(evidence: LocalAlertEvidence[], pattern: RegExp) {
  return evidence.filter((item) => pattern.test(normalizar([
    item.category, item.description, item.place, item.initialAction,
  ].filter(Boolean).join(' ')))).length;
}

function contarPorLugar(evidence: LocalAlertEvidence[]) {
  const counts = new Map<string, number>();
  for (const item of evidence) {
    const place = item.place?.trim();
    if (place) counts.set(place, (counts.get(place) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([place, total]) => ({ place, total }))
    .sort((a, b) => b.total - a.total || a.place.localeCompare(b.place, 'es'));
}

function contarUltimosSieteDias(evidence: LocalAlertEvidence[]) {
  const dates = evidence.map((item) => new Date(item.occurredAt).getTime()).filter(Number.isFinite);
  if (!dates.length) return 0;
  const newest = Math.max(...dates);
  const start = newest - 6 * 24 * 60 * 60 * 1000;
  return dates.filter((date) => date >= start && date <= newest).length;
}

export function generarAnalisisLocal(input: { total: number; periodoDias: number; evidence: LocalAlertEvidence[] }): LocalAlertAnalysis {
  const evidence = input.evidence;
  const byType = evidence.reduce<Record<string, number>>((result, item) => {
    const type = item.type || 'SIN_TIPO';
    result[type] = (result[type] || 0) + 1;
    return result;
  }, {});
  const byCategory = {
    tardanzas: cuentaCoincidencias(evidence, /tard|retras|puntual|despues del inicio|despues de la hora|hora de ingreso/),
    violenciaFisica: cuentaCoincidencias(evidence, /golpe|empuj|bofet|agredi|agresion|violencia fisic|sacud|confront/),
    sustancias: cuentaCoincidencias(evidence, /droga|sustancia|psicoactiv|consum/),
    lenguajeOfensivo: cuentaCoincidencias(evidence, /groser|insult|irrespet|ofensiv/),
  };
  const byPlace = contarPorLugar(evidence);
  const recentSevenDays = contarUltimosSieteDias(evidence);
  const typeParts = [
    byType.TIPO_I ? `${byType.TIPO_I} tipo I` : '',
    byType.TIPO_II ? `${byType.TIPO_II} tipo II` : '',
    byType.TIPO_III ? `${byType.TIPO_III} tipo III` : '',
  ].filter(Boolean);
  const categoryParts = [
    byCategory.tardanzas ? `${byCategory.tardanzas} asociados con tardanzas` : '',
    byCategory.violenciaFisica ? `${byCategory.violenciaFisica} asociados con violencia física` : '',
    byCategory.sustancias ? `${byCategory.sustancias} asociados con presunto consumo de sustancias` : '',
    byCategory.lenguajeOfensivo ? `${byCategory.lenguajeOfensivo} asociados con lenguaje ofensivo` : '',
  ].filter(Boolean);
  const summary = [
    `Se analizaron ${input.total} reportes de los últimos ${input.periodoDias} días${typeParts.length ? `: ${typeParts.join(', ')}` : ''}.`,
    categoryParts.length ? `Patrones descriptivos encontrados: ${categoryParts.join('; ')}.` : 'No se identificó una categoría textual dominante con la información disponible.',
    recentSevenDays > 1 ? `${recentSevenDays} registros se concentran en los siete días más recientes del conjunto analizado.` : '',
  ].filter(Boolean).join(' ');

  const hypotheses: string[] = [];
  if (recentSevenDays >= 3) hypotheses.push('Hipótesis de revisión: la concentración reciente puede indicar que el patrón continúa activo; debe comprobarse con seguimiento humano.');
  if (byCategory.tardanzas >= 2) hypotheses.push('Hipótesis de revisión: la puntualidad podría requerir un acuerdo de seguimiento con el estudiante y su acudiente, sin asumir una causa específica.');
  if (byCategory.violenciaFisica >= 1) hypotheses.push('Hipótesis de revisión: los hechos de posible agresión pueden reflejar conflictos no resueltos; se deben contrastar versiones y antecedentes.');
  if (byCategory.sustancias >= 1) hypotheses.push('Hipótesis de revisión: los registros sobre presuntas sustancias requieren validar hechos y contexto mediante la ruta institucional, sin emitir diagnósticos.');
  if (byCategory.lenguajeOfensivo >= 2) hypotheses.push('Hipótesis de revisión: las interacciones reportadas pueden mostrar una dificultad recurrente de convivencia que requiere acompañamiento pedagógico.');
  if (!hypotheses.length) hypotheses.push('La recurrencia puede requerir acompañamiento institucional; los reportes por sí solos no permiten determinar causas.');

  const suggestedActions: string[] = [];
  if ((byType.TIPO_III || 0) > 0) suggestedActions.push('Revisar de inmediato cada situación tipo III y confirmar la aplicación de la ruta institucional correspondiente.');
  if ((byType.TIPO_II || 0) > 0) suggestedActions.push('Verificar medidas de protección, versiones de los involucrados y seguimiento de las situaciones tipo II.');
  suggestedActions.push('Realizar revisión humana conjunta de la cronología, evitando tomar decisiones automáticas a partir de este análisis.');
  suggestedActions.push('Registrar una reunión de seguimiento con el estudiante y el acudiente, incluyendo compromisos verificables.');
  if (byPlace[0]?.total >= 2) suggestedActions.push(`Revisar condiciones de acompañamiento y supervisión en ${byPlace[0].place}, donde aparecen ${byPlace[0].total} registros.`);
  suggestedActions.push('Definir indicadores de seguimiento y una fecha de revisión para comprobar avances o nuevas incidencias.');

  const withInitialAction = evidence.filter((item) => Boolean(item.initialAction?.trim())).length;
  const withPlace = evidence.filter((item) => Boolean(item.place?.trim())).length;
  const withDescription = evidence.filter((item) => Boolean(item.description?.trim())).length;
  const positiveSignals: string[] = [];
  if (withInitialAction) positiveSignals.push(`${withInitialAction} de ${evidence.length} reportes documentan una actuación inicial.`);
  if (withPlace === evidence.length && evidence.length) positiveSignals.push('Todos los reportes analizados registran el lugar del hecho.');
  if (evidence.length >= 3) positiveSignals.push('Existe una secuencia cronológica suficiente para revisar recurrencia y evolución.');

  const missingInformation = ['Se requiere validación humana del contexto, las versiones de los involucrados y el resultado de cada actuación.'];
  if (withDescription < evidence.length) missingInformation.push(`${evidence.length - withDescription} reportes no contienen una descripción suficiente para el análisis textual.`);
  if (withPlace < evidence.length) missingInformation.push(`${evidence.length - withPlace} reportes no registran el lugar del hecho.`);
  if (withInitialAction < evidence.length) missingInformation.push(`${evidence.length - withInitialAction} reportes no documentan una actuación inicial.`);
  missingInformation.push('El análisis no conoce factores personales, familiares, clínicos ni sociales y no debe inferirlos.');

  const fields = Math.max(evidence.length * 5, 1);
  const completeFields = evidence.reduce((total, item) => total
    + Number(Boolean(item.type)) + Number(Boolean(item.occurredAt)) + Number(Boolean(item.description?.trim()))
    + Number(Boolean(item.place?.trim())) + Number(Boolean(item.initialAction?.trim())), 0);
  const completeness = completeFields / fields;
  const confidence = Math.round(Math.min(0.9, 0.45 + completeness * 0.35 + Math.min(evidence.length / 10, 1) * 0.1) * 100) / 100;

  return { summary, hypotheses, suggestedActions, positiveSignals, missingInformation, confidence, patterns: { byType, byCategory, byPlace, recentSevenDays } };
}
