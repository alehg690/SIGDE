'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

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

function fechaLegible(value: string | null) {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(date);
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
  const [curso, setCurso] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [nota, setNota] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const cargar = useCallback(async (preferidaId?: number) => {
    const params = new URLSearchParams({ historial: '1' });
    if (busqueda.trim()) params.set('buscar', busqueda.trim());
    if (filtroEstado !== 'Todos') params.set('estado', filtroEstado);
    if (filtroNivel !== 'Todos') params.set('nivel', filtroNivel);
    if (filtroRegla !== 'Todos') params.set('regla', filtroRegla);
    if (curso.trim()) params.set('curso', curso.trim());
    if (desde) params.set('desde', desde);
    if (hasta) params.set('hasta', hasta);
    const response = await fetch(`/api/alertas?${params}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudieron cargar las alertas.'));
    const data = await response.json() as Alert[];
    setAlertas(data);
    setSeleccionadaId((actual) => {
      const objetivo = preferidaId ?? actual ?? initialAlertId;
      return data.some((item) => item.id === objetivo) ? objetivo! : data[0]?.id ?? null;
    });
  }, [busqueda, curso, desde, filtroEstado, filtroNivel, filtroRegla, hasta, initialAlertId]);

  const cargarDetalle = useCallback(async (id: number) => {
    const response = await fetch(`/api/alertas/${id}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudo cargar el detalle de la alerta.'));
    setDetalle(await response.json() as AlertDetail);
  }, []);

  useEffect(() => {
    let active = true;
    const execute = () => void cargar().catch((error) => { if (active) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir el seguimiento.' }); }).finally(() => { if (active) setCargando(false); });
    const debounce = window.setTimeout(execute, 250);
    const interval = window.setInterval(() => { if (document.visibilityState === 'visible') execute(); }, 15_000);
    return () => { active = false; window.clearTimeout(debounce); window.clearInterval(interval); };
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
  const activeCount = alertas.filter((item) => ['new', 'reviewed', 'monitoring'].includes(item.estado)).length;
  const unreadCount = alertas.filter((item) => item.estado === 'new').length;
  const highCount = alertas.filter((item) => item.nivelAtencion === 'high' && ['new', 'reviewed', 'monitoring'].includes(item.estado)).length;

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
    <header className="module-page-heading"><div className="module-title"><h2>Alertas por reglas</h2><p>Consulta patrones objetivos, evidencia, análisis orientativo e historial.</p></div><div className="alert-heading-actions"><span className="module-live-badge"><i /> En vivo</span>{canManage && <button type="button" className="module-secondary-action" onClick={() => exportarCsv(alertas)}>Exportar CSV</button>}</div></header>
    {feedback && <p className={`feedback ${feedback.tipo}`} role="status">{feedback.texto}</p>}
    <div className="module-kpi-grid"><article><span>Alertas activas</span><strong>{activeCount}</strong><small>Patrones que requieren atención</small></article><article><span>Nuevas</span><strong>{unreadCount}</strong><small>Pendientes de revisión</small></article><article><span>Prioridad alta</span><strong>{highCount}</strong><small>Sin acciones automáticas</small></article></div>
    <div className="alert-filter-grid">
      <label><span>Buscar estudiante</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Nombre del estudiante" /></label>
      <label><span>Estado</span><select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)}><option>Todos</option>{Object.entries(STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>Nivel</span><select value={filtroNivel} onChange={(event) => setFiltroNivel(event.target.value)}><option>Todos</option>{Object.entries(LEVEL_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label><span>Regla</span><select value={filtroRegla} onChange={(event) => setFiltroRegla(event.target.value)}><option>Todos</option>{rules.map((rule) => <option key={rule}>{rule}</option>)}</select></label>
      <label><span>Curso</span><input value={curso} onChange={(event) => setCurso(event.target.value)} placeholder="Ej. 11-2" /></label>
      <label><span>Desde</span><input type="date" value={desde} onChange={(event) => setDesde(event.target.value)} /></label>
      <label><span>Hasta</span><input type="date" value={hasta} onChange={(event) => setHasta(event.target.value)} /></label>
    </div>
    <div className="module-split-layout alert-split-layout">
      <div className="module-list-panel"><div className="module-list-heading"><strong>Alertas activas y cerradas</strong><span>{cargando ? 'Cargando...' : `${alertas.length} resultados`}</span></div><div className="follow-up-list">
        {!cargando && alertas.length === 0 && <div className="module-empty-state"><strong>Sin alertas</strong><p>No hay resultados para los filtros seleccionados.</p></div>}
        {alertas.map((alerta) => <button type="button" key={alerta.id} className={seleccionadaId === alerta.id ? 'follow-up-row follow-up-row--active' : 'follow-up-row'} onClick={() => setSeleccionadaId(alerta.id)}>
          <span className={`follow-up-priority follow-up-priority--${alerta.nivelAtencion}`}>{alerta.estado === 'new' ? '●' : alerta.cantidadReportes}</span>
          <span><strong>{alerta.titulo}</strong><small>{alerta.estudiante} · {alerta.resumenCorto}</small><em>{alerta.origen === 'rule+ai' ? 'Regla + IA' : 'Regla'} · {LEVEL_LABELS[alerta.nivelAtencion]}</em></span>
          <span className={`module-status module-status--${alerta.estado}`}>{STATUS_LABELS[alerta.estado]}</span><time dateTime={alerta.actualizadoEn}>{fechaLegible(alerta.actualizadoEn)}</time>
        </button>)}
      </div></div>
      <aside className="module-detail-panel alert-detail-panel">{detalle ? <>
        <div className="module-detail-heading"><div><span>{detalle.ruleId}</span><h3>{detalle.estudiante}</h3><p>Curso {detalle.grado}-{detalle.grupo} · {detalle.origen === 'rule+ai' ? 'Regla enriquecida por IA' : 'Generada por regla'}</p></div><strong>{detalle.cantidadReportes}<small>registros</small></strong></div>
        <dl className="module-detail-metadata"><div><dt>Estado</dt><dd>{STATUS_LABELS[detalle.estado]}</dd></div><div><dt>Nivel</dt><dd>{LEVEL_LABELS[detalle.nivelAtencion]}</dd></div><div><dt>Periodo</dt><dd>{fechaLegible(detalle.periodoInicio)} — {fechaLegible(detalle.periodoFin)}</dd></div><div><dt>Confianza</dt><dd>{detalle.confianza == null ? 'No disponible' : `${Math.round(detalle.confianza * 100)}%`}</dd></div></dl>
        <section className="alert-detail-section"><h4>Regla activada</h4><p>{detalle.resumenCorto}</p></section>
        <section className="alert-detail-section"><h4>Evidencias relacionadas</h4>{detalle.evidencia.length ? <ul>{detalle.evidencia.map((item) => <li key={item.id}><strong>Reporte #{item.reporteId}</strong> · {item.tipoFalta || item.tipoEvidencia} · {fechaLegible(item.fecha)}{item.situacion ? ` · ${item.situacion}` : ''}</li>)}</ul> : <p>Sin evidencias disponibles.</p>}</section>
        <section className="alert-detail-section"><h4>Resumen generado por IA</h4><p>{detalle.analisisIa?.summary || 'La alerta se mantiene basada en reglas. El análisis de IA aún no está disponible.'}</p></section>
        <AnalysisList title="Posibles explicaciones (hipótesis)" items={detalle.analisisIa?.hypotheses} />
        <AnalysisList title="Acciones sugeridas" items={detalle.analisisIa?.suggestedActions} />
        <AnalysisList title="Señales positivas" items={detalle.analisisIa?.positiveSignals} />
        <AnalysisList title="Información faltante" items={detalle.analisisIa?.missingInformation} />
        <p className="alert-ai-notice">Análisis orientativo generado automáticamente. Requiere revisión humana.</p>
        <section className="alert-detail-section"><h4>Historial de cambios</h4>{detalle.historial.length ? <ol className="alert-history">{detalle.historial.map((item) => <li key={item.id}><strong>{item.estadoAnterior ? `${item.estadoAnterior} → ` : ''}{item.estadoNuevo}</strong><span>{item.motivo || 'Sin nota'} · {item.usuario || item.proceso || 'Proceso del sistema'} · {fechaLegible(item.creadoEn)}</span></li>)}</ol> : <p>Sin cambios registrados.</p>}</section>
        {canManage ? <div className="follow-up-editor"><label><span>Motivo o corrección</span><textarea value={nota} maxLength={1500} onChange={(event) => setNota(event.target.value)} placeholder="Obligatorio para corregir, descartar o cerrar." /><small>{nota.length}/1500</small></label><div className="alert-action-grid"><button disabled={guardando} onClick={() => void actuar('review')}>Marcar como revisada</button><button disabled={guardando} onClick={() => void actuar('confirm')}>Confirmar</button><button disabled={guardando} onClick={() => void actuar('correct')}>Corregir</button><button disabled={guardando} onClick={() => void actuar('dismiss')}>Descartar</button><button disabled={guardando} onClick={() => void actuar('close')}>Cerrar alerta</button><button disabled={guardando} onClick={() => void actuar('regenerate')}>Regenerar análisis</button></div></div> : <div className="module-readonly-note"><strong>Consulta docente</strong><p>El análisis y la evidencia son de consulta. Coordinación registra los cambios de estado.</p></div>}
      </> : <div className="module-empty-state"><strong>Selecciona una alerta</strong><p>Aquí podrás consultar evidencia, análisis e historial.</p></div>}</aside>
    </div>
  </section>;
}

function AnalysisList({ title, items }: { title: string; items?: string[] }) {
  return <section className="alert-detail-section"><h4>{title}</h4>{items?.length ? <ul>{items.map((item, index) => <li key={`${title}-${index}`}>{item}</li>)}</ul> : <p>Sin información suficiente.</p>}</section>;
}
