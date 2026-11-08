'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { parseReportDate } from '@/lib/report-dates';
import ModuleHeader from '@/components/ui/ModuleHeader';
import KpiGrid from '@/components/ui/KpiGrid';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';

type AlertStatus = 'new' | 'reviewed' | 'monitoring' | 'resolved' | 'dismissed';
type AttentionLevel = 'informational' | 'low' | 'medium' | 'high';
type Alert = {
  id: number; estudianteId: number; estudiante: string; grado: string; grupo: string; ruleId: string; tipo: string;
  titulo: string; resumenCorto: string; cantidadReportes: number; estado: AlertStatus; nivelAtencion: AttentionLevel;
  confianza: number | null; periodoInicio: string | null; periodoFin: string | null; origen: string;
  primerDetectadoEn: string; ultimoDetectadoEn: string; creadoEn: string; actualizadoEn: string;
};
type AlertDetail = Alert & {
  notas: string | null; notaResolucion: string | null; revisadoPor: string | null; analisisGeneradoEn: string | null;
  evidencia: Array<{ id: number; reporteId: number | null; tipoEvidencia: string; tipoFalta: string | null; fecha: string | null; situacion: string | null; estado: string | null }>;
  analisisIa: null | { summary: string; hypotheses: string[]; suggestedActions: string[]; positiveSignals: string[]; missingInformation: string[]; confidence: number };
  historial: Array<{ id: number; estadoAnterior: string | null; estadoNuevo: string; motivo: string | null; proceso: string | null; usuario: string | null; creadoEn: string }>;
};
type Feedback = { tipo: 'success' | 'error'; texto: string };

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

const STATUS_LABELS: Record<AlertStatus, string> = { new: 'Nueva', reviewed: 'Revisada', monitoring: 'En seguimiento', resolved: 'Resuelta', dismissed: 'Descartada' };
const LEVEL_LABELS: Record<AttentionLevel, string> = { informational: 'Informativa', low: 'Observación', medium: 'Seguimiento recomendado', high: 'Revisión humana prioritaria' };

function origenLabel(origen: string, detail = false) {
  if (origen === 'rule+local') return 'Análisis de SIGDE';
  if (origen === 'rule+ai') return detail ? 'Análisis anterior de SIGDE' : 'Análisis anterior';
  return detail ? 'Alerta generada por regla institucional' : 'Regla institucional';
}

function reglaLabel(ruleId: string) {
  const labels: Record<string, string> = {
    REPORT_RECURRENCE_30D: 'Reincidencia de reportes en 30 días',
  };
  return labels[ruleId] || ruleId.replaceAll('_', ' ').toLocaleLowerCase('es-CO').replace(/^./, (letter) => letter.toLocaleUpperCase('es-CO'));
}

function estadoLabel(value: string | null) {
  if (!value) return '';
  return STATUS_LABELS[value as AlertStatus] || value.replaceAll('_', ' ');
}

function evidenciaLabel(value: string | null) {
  if (!value) return 'Evidencia institucional';
  return value.replace(/^TIPO_/, 'Tipo ').replaceAll('_', ' ');
}

function textoLegible(value: string | null) {
  if (!value) return 'Sin observación';
  if (/regla\s+REPORT_RECURRENCE_30D\s+activada/i.test(value)) {
    return 'SIGDE detectó reincidencia de reportes durante los últimos 30 días.';
  }
  return value.replaceAll('REPORT_RECURRENCE_30D', 'reincidencia de reportes en 30 días');
}

function resumenAnalisisClaro(detalle: AlertDetail) {
  const original = detalle.analisisIa?.summary;
  if (!original) return ['La alerta fue generada por una regla institucional y está pendiente de análisis.'];
  const tipos = original.match(/(\d+) tipo I, (\d+) tipo II, (\d+) tipo III/i);
  const tardanzas = original.match(/(\d+) asociados? con tardanzas/i);
  const violencia = original.match(/(\d+) asociados? con violencia física/i);
  const recientes = original.match(/(\d+) registros? se concentran? en los siete días más recientes/i);
  if (!tipos) return [original];
  const partes = [`En los últimos 30 días se registraron ${detalle.cantidadReportes} reportes: ${tipos[1]} de Tipo I, ${tipos[2]} de Tipo II y ${tipos[3]} de Tipo III.`];
  const patrones: string[] = [];
  if (tardanzas) patrones.push(`${tardanzas[1]} ${tardanzas[1] === '1' ? 'relacionado' : 'relacionados'} con tardanzas`);
  if (violencia) patrones.push(`${violencia[1]} ${violencia[1] === '1' ? 'relacionado' : 'relacionados'} con posibles situaciones de violencia física`);
  if (patrones.length) partes.push(`Entre los reportes se identificaron ${patrones.join(' y ')}.`);
  if (recientes) partes.push(`${recientes[1]} ${recientes[1] === '1' ? 'registro ocurrió' : 'registros ocurrieron'} durante la última semana, por lo que conviene revisar la evolución reciente del caso.`);
  return partes;
}

function fechaLegible(value: string | null) {
  if (!value) return 'Sin fecha';
  const date = parseReportDate(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(date);
}

function normalizarFiltro(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es-CO').trim();
}

function exportarCsv(alertas: Alert[]) {
  const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = [['Estudiante', 'Curso', 'Regla', 'Estado', 'Nivel', 'Registros', 'Periodo inicio', 'Periodo fin', 'Actualizada'], ...alertas.map((item) => [item.estudiante, `${item.grado}-${item.grupo}`, item.ruleId, STATUS_LABELS[item.estado], LEVEL_LABELS[item.nivelAtencion], item.cantidadReportes, item.periodoInicio || '', item.periodoFin || '', item.actualizadoEn])];
  const blob = new Blob([rows.map((row) => row.map(escape).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = `alertas-sigde-${new Date().toISOString().slice(0, 10)}.csv`; anchor.click();
  URL.revokeObjectURL(url);
}

export default function FollowUpWorkspace({ canManage, initialAlertId }: { canManage: boolean; initialAlertId?: number }) {
  const [alertas, setAlertas] = useState<Alert[]>([]);
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(initialAlertId ?? null);
  const [detalle, setDetalle] = useState<AlertDetail | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [filtroNivel, setFiltroNivel] = useState('Todos');
  const [filtroRegla, setFiltroRegla] = useState('Todos');
  const [filtroOrigen, setFiltroOrigen] = useState('Todos');
  const [curso, setCurso] = useState('');
  const [nota, setNota] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  useAutoDismiss(Boolean(feedback), () => setFeedback(null));

  const cargar = useCallback(async (preferidaId?: number) => {
    const params = new URLSearchParams({ historial: '1' });
    const response = await fetch(`/api/alertas?${params}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudieron cargar las alertas.'));
    const data = await response.json() as Alert[];
    setAlertas(data);
    setSeleccionadaId((actual) => {
      const objetivo = preferidaId ?? actual ?? initialAlertId;
      return objetivo && data.some((item) => item.id === objetivo) ? objetivo : null;
    });
  }, [initialAlertId]);

  const cargarDetalle = useCallback(async (id: number) => {
    const response = await fetch(`/api/alertas/${id}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudo cargar el detalle de la alerta.'));
    setDetalle(await response.json() as AlertDetail);
  }, []);

  useEffect(() => {
    let active = true;
    const execute = () => void cargar().catch((error) => { if (active) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir el seguimiento.' }); }).finally(() => { if (active) setCargando(false); });
    execute();
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') execute(); }, 15_000);
    return () => { active = false; window.clearInterval(interval); };
  }, [cargar]);

  useEffect(() => {
    if (!seleccionadaId) return;
    let active = true;
    const timer = window.setTimeout(() => {
      void cargarDetalle(seleccionadaId).catch((error) => { if (active) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo cargar el detalle.' }); });
    }, 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [cargarDetalle, seleccionadaId]);

  const rules = useMemo(() => Array.from(new Set(alertas.map((item) => item.ruleId))).sort(), [alertas]);
  const alertasVisibles = useMemo(() => {
    const texto = normalizarFiltro(busqueda);
    const cursoBuscado = normalizarFiltro(curso).replace(/\s/g, '');
    return alertas.filter((item) => {
      const cursoItem = normalizarFiltro(`${item.grado}-${item.grupo}`).replace(/\s/g, '');
      const contenido = normalizarFiltro(`${item.estudiante} ${item.titulo} ${item.resumenCorto} ${reglaLabel(item.ruleId)} ${item.grado}-${item.grupo}`);
      return (!texto || contenido.includes(texto))
        && (filtroEstado === 'Todos' || item.estado === filtroEstado)
        && (filtroNivel === 'Todos' || item.nivelAtencion === filtroNivel)
        && (filtroRegla === 'Todos' || item.ruleId === filtroRegla)
        && (!cursoBuscado || cursoItem.includes(cursoBuscado))
        && (filtroOrigen === 'Todos' || item.origen === filtroOrigen);
    });
  }, [alertas, busqueda, curso, filtroEstado, filtroNivel, filtroOrigen, filtroRegla]);
  const reviewCount = alertasVisibles.filter((item) => ['reviewed', 'monitoring'].includes(item.estado)).length;
  const unreadCount = alertasVisibles.filter((item) => item.estado === 'new').length;
  const resolvedCount = alertasVisibles.filter((item) => item.estado === 'resolved').length;
  const highCount = alertasVisibles.filter((item) => item.nivelAtencion === 'high' && ['new', 'reviewed', 'monitoring'].includes(item.estado)).length;
  const cerrarDetalle = useCallback(() => { if (!guardando) { setSeleccionadaId(null); setDetalle(null); } }, [guardando]);
  const detalleRef = useDialogFocus<HTMLElement>(seleccionadaId !== null, cerrarDetalle, !guardando);

  async function actuar(accion: 'review' | 'confirm' | 'correct' | 'dismiss' | 'close' | 'regenerate') {
    if (!detalle) return;
    setGuardando(true); setFeedback(null);
    try {
      const response = await fetch(`/api/alertas/${detalle.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion, nota }) });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo actualizar la alerta.'));
      setDetalle(await response.json() as AlertDetail);
      setNota('');
      await cargar(detalle.id);
      setFeedback({ tipo: 'success', texto: accion === 'regenerate' ? 'Análisis regenerado.' : 'Acción registrada y auditada.' });
      window.dispatchEvent(new Event('sigde:alerts-updated'));
    } catch (error) { setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo actualizar la alerta.' }); }
    finally { setGuardando(false); }
  }

  return <section className="workspace-panel follow-up-workspace">
    <ModuleHeader icon={<svg viewBox="0 0 24 24"><path d="M6 3.5h9l3 3v14H6z"/><path d="M15 3.5v3h3M9 11h6m-6 3h6m-6 3h4"/></svg>} kicker="Análisis institucional" title="Seguimiento de alertas" description="Revisa patrones objetivos, evidencia e historial antes de tomar decisiones institucionales." action={<div className="follow-up-export"><span className="module-live-badge"><i /> En vivo</span>{canManage && <button type="button" className="ui-button ui-button--primary" disabled={cargando || alertasVisibles.length === 0} onClick={() => exportarCsv(alertasVisibles)}>Exportar CSV</button>}<small>{canManage ? 'Descarga los resultados filtrados' : 'Vista de consulta'}</small></div>} />
    {feedback && <p className={`feedback ${feedback.tipo}`} role="status">{feedback.texto}</p>}
    <KpiGrid label="Resumen de alertas" items={[{ label: 'Total de alertas', value: cargando ? '—' : alertasVisibles.length, detail: 'Registros disponibles', icon: '01' }, { label: 'Nuevas', value: cargando ? '—' : unreadCount, detail: 'Pendientes de revisión', icon: '02' }, { label: 'En revisión', value: cargando ? '—' : reviewCount, detail: 'Con seguimiento activo', icon: '03' }, { label: 'Resueltas', value: cargando ? '—' : resolvedCount, detail: 'Procesos finalizados', icon: '04' }, { label: 'Prioridad alta', value: cargando ? '—' : highCount, detail: 'Requieren revisión humana', icon: '05' }]} />
    <section className="follow-up-explorer" aria-labelledby="follow-up-explorer-title"><header><div><span>EXPLORADOR</span><h3 id="follow-up-explorer-title">Alertas institucionales</h3><p>Filtra los registros y selecciona una alerta para consultar su trazabilidad.</p></div><strong role="status" aria-live="polite" aria-atomic="true">{cargando ? 'Cargando…' : `${alertasVisibles.length} ${alertasVisibles.length === 1 ? 'registro' : 'registros'}`}</strong></header><div className="alert-filter-grid">
      <label className="alert-search"><span>Buscar</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Estudiante, curso o alerta" /></label>
      <label><span>Estado</span><select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)}><option>Todos</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>Prioridad</span><select value={filtroNivel} onChange={(event) => setFiltroNivel(event.target.value)}><option>Todos</option>{Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>Regla</span><select value={filtroRegla} onChange={(event) => setFiltroRegla(event.target.value)}><option>Todos</option>{rules.map((rule) => <option key={rule} value={rule}>{reglaLabel(rule)}</option>)}</select></label>
      <label><span>Curso</span><input value={curso} onChange={(event) => setCurso(event.target.value)} placeholder="Ej. 11-2" /></label>
      <label><span>Origen</span><select value={filtroOrigen} onChange={(event) => setFiltroOrigen(event.target.value)}><option>Todos</option><option value="rule">Regla</option><option value="rule+local">Análisis local</option><option value="rule+ai">Análisis heredado</option></select></label>
    </div><div className="follow-up-list">
        {!cargando && alertasVisibles.length === 0 && <div className="module-empty-state"><span className="follow-up-empty-icon" aria-hidden="true">⌕</span><strong>Sin alertas para mostrar</strong><p>No hay resultados para los filtros seleccionados.</p></div>}
        {alertasVisibles.map((alerta) => <button type="button" key={alerta.id} className="follow-up-row" onClick={() => setSeleccionadaId(alerta.id)}>
          <span className={`follow-up-priority follow-up-priority--${alerta.nivelAtencion}`}>{alerta.estado === 'new' ? '●' : alerta.cantidadReportes}</span>
          <span className="follow-up-row-copy"><strong>{alerta.titulo}</strong><small>{alerta.estudiante} · {alerta.grado}-{alerta.grupo}</small><em>{origenLabel(alerta.origen)} · {LEVEL_LABELS[alerta.nivelAtencion]}</em></span>
          <span className="follow-up-records"><strong>{alerta.cantidadReportes}</strong><small>registros</small></span><span className={`module-status module-status--${alerta.estado}`}>{STATUS_LABELS[alerta.estado]}</span><time dateTime={alerta.actualizadoEn}><small>Actualizada</small>{fechaLegible(alerta.actualizadoEn)}</time>
        </button>)}
      </div></section>
    {seleccionadaId !== null && <div className="follow-up-modal-backdrop" role="presentation" onMouseDown={cerrarDetalle}><aside ref={detalleRef} className="module-detail-panel alert-detail-panel follow-up-modal" role="dialog" aria-modal="true" aria-labelledby="follow-up-detail-title" tabIndex={-1} onMouseDown={(event) => event.stopPropagation()}>{detalle ? <>
        <button className="follow-up-modal-close" type="button" aria-label="Cerrar detalle" disabled={guardando} onClick={cerrarDetalle}>×</button>
        <div className="module-detail-heading"><div><span>{reglaLabel(detalle.ruleId)}</span><h3 id="follow-up-detail-title">{detalle.estudiante}</h3><p>Curso {detalle.grado}-{detalle.grupo} · {origenLabel(detalle.origen, true)}</p></div><strong>{detalle.cantidadReportes}<small>registros</small></strong></div>
        <dl className="module-detail-metadata"><div><dt>Estado</dt><dd>{STATUS_LABELS[detalle.estado]}</dd></div><div><dt>Nivel</dt><dd>{LEVEL_LABELS[detalle.nivelAtencion]}</dd></div><div><dt>Periodo</dt><dd>{fechaLegible(detalle.periodoInicio)} — {fechaLegible(detalle.periodoFin)}</dd></div><div><dt>Confianza</dt><dd>{detalle.confianza == null ? 'No disponible' : `${Math.round(detalle.confianza * 100)}%`}</dd></div></dl>
        <div className="follow-up-detail-summary"><section><span>Motivo de la alerta</span><strong>{reglaLabel(detalle.ruleId)}</strong><p>{detalle.resumenCorto}</p></section><section><span>Origen del análisis</span><strong>{origenLabel(detalle.origen, true)}</strong><p>La valoración final siempre corresponde al equipo institucional.</p></section></div>
        <div className="follow-up-detail-columns"><div><section className="alert-detail-section alert-analysis-summary"><h4>Resumen del análisis</h4><ul className="alert-analysis-points">{resumenAnalisisClaro(detalle).map((item) => <li key={item}>{item}</li>)}</ul></section><div className="follow-up-analysis-grid"><AnalysisList title="Posibles explicaciones" items={detalle.analisisIa?.hypotheses} /><AnalysisList title="Acciones sugeridas" items={detalle.analisisIa?.suggestedActions} /><AnalysisList title="Señales positivas" items={detalle.analisisIa?.positiveSignals} /><AnalysisList title="Información faltante" items={detalle.analisisIa?.missingInformation} /></div><p className="alert-ai-notice">Análisis orientativo generado por SIGDE. Requiere revisión humana.</p></div><div className="follow-up-support-grid"><section className="alert-detail-section alert-evidence-section"><h4>Evidencias relacionadas <span>{detalle.evidencia.length}</span></h4>{detalle.evidencia.length ? <ul>{detalle.evidencia.map((item) => <li key={item.id}><strong>Reporte #{item.reporteId}</strong><span>{evidenciaLabel(item.tipoFalta || item.tipoEvidencia)} · {fechaLegible(item.fecha)}</span>{item.situacion && <small>{item.situacion}</small>}</li>)}</ul> : <p>Sin evidencias disponibles.</p>}</section><section className="alert-detail-section"><h4>Historial de la alerta</h4>{detalle.historial.length ? <ol className="alert-history">{detalle.historial.map((item) => <li key={item.id}><strong>{item.estadoAnterior ? `${estadoLabel(item.estadoAnterior)} → ${estadoLabel(item.estadoNuevo)}` : 'Alerta creada'}</strong><span>{textoLegible(item.motivo)}</span><small>Registrado por {item.usuario || item.proceso || 'SIGDE'} · {fechaLegible(item.creadoEn)}</small></li>)}</ol> : <p>Esta alerta todavía no registra cambios.</p>}</section></div></div>
        {canManage ? <div className="follow-up-editor"><label><span>Motivo o corrección</span><textarea value={nota} maxLength={1500} onChange={(event) => setNota(event.target.value)} placeholder="Obligatorio para corregir, descartar o cerrar." /><small>{nota.length}/1500</small></label><div className="alert-action-grid"><button disabled={guardando} onClick={() => void actuar('review')}>Marcar como revisada</button><button disabled={guardando} onClick={() => void actuar('confirm')}>Confirmar</button><button disabled={guardando} onClick={() => void actuar('correct')}>Corregir</button><button disabled={guardando} onClick={() => void actuar('dismiss')}>Descartar</button><button disabled={guardando} onClick={() => void actuar('close')}>Cerrar alerta</button><button disabled={guardando} onClick={() => void actuar('regenerate')}>Regenerar análisis</button></div></div> : <div className="module-readonly-note"><strong>Consulta docente</strong><p>El análisis y la evidencia son de consulta. Coordinación registra los cambios de estado.</p></div>}
      </> : <div className="module-empty-state"><strong>Cargando detalle…</strong><p>Estamos preparando la trazabilidad de la alerta.</p></div>}</aside></div>}
  </section>;
}

function AnalysisList({ title, items }: { title: string; items?: string[] }) {
  return <section className="alert-detail-section"><h4>{title}</h4>{items?.length ? <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <p>Sin información suficiente.</p>}</section>;
}
