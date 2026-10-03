import { createHash } from 'node:crypto';

export const ALERT_RULE_ID = 'REPORT_RECURRENCE_30D';
export const ALERT_RULES_VERSION = 'report-recurrence-v2';
export const ALERT_PROMPT_VERSION = 'student-alert-analysis-v1';

export type AttentionLevel = 'informational' | 'low' | 'medium' | 'high';

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
