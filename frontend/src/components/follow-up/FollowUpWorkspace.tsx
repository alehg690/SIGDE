'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

type Alerta = {
  id: number;
  estudianteId: number;
  estudiante: string;
  grado: string;
  grupo: string;
  cantidadReportes: number;
  estado: 'activa' | 'en_seguimiento' | 'resuelta';
  notas: string | null;
  creadoEn: string;
  actualizadoEn: string;
};

type Feedback = { tipo: 'success' | 'error'; texto: string };

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function etiquetaEstado(value: Alerta['estado']) {
  if (value === 'en_seguimiento') return 'En seguimiento';
  if (value === 'resuelta') return 'Resuelta';
  return 'Activa';
}

function fechaLegible(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(date);
}

export default function FollowUpWorkspace({ canManage }: { canManage: boolean }) {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [seleccionadaId, setSeleccionadaId] = useState<number | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('Todos');
  const [estado, setEstado] = useState<Alerta['estado']>('activa');
  const [notas, setNotas] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const cargar = useCallback(async (preferidaId?: number) => {
    const response = await fetch('/api/alertas', { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudieron cargar las alertas.'));
    const data = await response.json() as Alerta[];
    setAlertas(data);
    setSeleccionadaId((actual) => {
      const objetivo = preferidaId ?? actual;
      return data.some((item) => item.id === objetivo) ? objetivo : data[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let activa = true;
    const timer = window.setTimeout(() => {
      void cargar().catch((error) => {
        if (activa) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir el seguimiento.' });
      }).finally(() => { if (activa) setCargando(false); });
    }, 0);
    return () => { activa = false; window.clearTimeout(timer); };
  }, [cargar]);

  const seleccionada = alertas.find((item) => item.id === seleccionadaId) ?? null;
  useEffect(() => {
    if (!seleccionada) return;
    const timer = window.setTimeout(() => {
      setEstado(seleccionada.estado);
      setNotas(seleccionada.notas ?? '');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [seleccionada]);

  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return alertas.filter((alerta) => {
      const coincideTexto = !termino || [alerta.estudiante, alerta.grado, alerta.grupo, alerta.notas].join(' ').toLocaleLowerCase('es').includes(termino);
      return coincideTexto && (filtroEstado === 'Todos' || alerta.estado === filtroEstado);
    });
  }, [alertas, busqueda, filtroEstado]);

  async function actualizar() {
    if (!seleccionada) return;
    setGuardando(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/alertas/${seleccionada.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado, notas }),
      });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo actualizar la alerta.'));
      await cargar(seleccionada.id);
      setFeedback({ tipo: 'success', texto: estado === 'resuelta' ? 'Alerta resuelta y retirada de la lista activa.' : 'Seguimiento actualizado correctamente.' });
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo actualizar la alerta.' });
    } finally {
      setGuardando(false);
    }
  }

  const reincidencias = alertas.filter((item) => item.cantidadReportes >= 5).length;
  const enSeguimiento = alertas.filter((item) => item.estado === 'en_seguimiento').length;

  return <section className="workspace-panel follow-up-workspace">
    <header className="module-page-heading"><div className="module-title"><h2>Seguimiento de alertas</h2><p>Prioriza reincidencias y documenta las acciones de acompañamiento.</p></div><span className="module-live-badge"><i /> Reglas activas</span></header>
    {feedback && <p className={`feedback ${feedback.tipo}`} role="status">{feedback.texto}</p>}
    <div className="module-kpi-grid">
      <article><span>Alertas activas</span><strong>{alertas.length}</strong><small>Casos que requieren atención</small></article>
      <article><span>En seguimiento</span><strong>{enSeguimiento}</strong><small>Con acción institucional</small></article>
      <article><span>Alta reincidencia</span><strong>{reincidencias}</strong><small>Cinco reportes o más</small></article>
    </div>
    <div className="module-split-layout">
      <div className="module-list-panel">
        <div className="module-filter-bar">
          <label className="module-search-field"><span>Buscar caso</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Estudiante, curso o nota" /></label>
          <label><span>Estado</span><select value={filtroEstado} onChange={(event) => setFiltroEstado(event.target.value)}><option>Todos</option><option value="activa">Activa</option><option value="en_seguimiento">En seguimiento</option></select></label>
        </div>
        <div className="module-list-heading"><strong>Casos abiertos</strong><span>{cargando ? 'Cargando...' : `${filtradas.length} resultados`}</span></div>
        <div className="follow-up-list">
          {!cargando && filtradas.length === 0 && <div className="module-empty-state"><strong>Sin alertas pendientes</strong><p>No hay casos que coincidan con los filtros.</p></div>}
          {filtradas.map((alerta) => <button type="button" key={alerta.id} className={seleccionada?.id === alerta.id ? 'follow-up-row follow-up-row--active' : 'follow-up-row'} onClick={() => setSeleccionadaId(alerta.id)}>
            <span className={alerta.cantidadReportes >= 5 ? 'follow-up-priority follow-up-priority--high' : 'follow-up-priority'}>{alerta.cantidadReportes}</span>
            <span><strong>{alerta.estudiante}</strong><small>{alerta.grado}-{alerta.grupo} · {alerta.cantidadReportes} reportes</small></span>
            <span className={`module-status module-status--${alerta.estado}`}>{etiquetaEstado(alerta.estado)}</span>
            <time dateTime={alerta.creadoEn}>{fechaLegible(alerta.creadoEn)}</time>
          </button>)}
        </div>
      </div>
      <aside className="module-detail-panel">
        {seleccionada ? <>
          <div className="module-detail-heading"><div><span>Alerta #{seleccionada.id}</span><h3>{seleccionada.estudiante}</h3><p>Curso {seleccionada.grado}-{seleccionada.grupo}</p></div><strong>{seleccionada.cantidadReportes}<small>reportes</small></strong></div>
          <dl className="module-detail-metadata"><div><dt>Detectada</dt><dd>{fechaLegible(seleccionada.creadoEn)}</dd></div><div><dt>Estado</dt><dd>{etiquetaEstado(seleccionada.estado)}</dd></div></dl>
          {canManage ? <div className="follow-up-editor">
            <label><span>Estado del caso</span><select value={estado} onChange={(event) => setEstado(event.target.value as Alerta['estado'])}><option value="activa">Activa</option><option value="en_seguimiento">En seguimiento</option><option value="resuelta">Resuelta</option></select></label>
            <label><span>Notas de seguimiento</span><textarea value={notas} maxLength={1500} onChange={(event) => setNotas(event.target.value)} placeholder="Registra compromisos, responsables y próximos pasos." /><small>{notas.length}/1500</small></label>
            <button type="button" className="module-primary-action" disabled={guardando} onClick={() => void actualizar()}>{guardando ? 'Guardando...' : 'Guardar seguimiento'}</button>
          </div> : <div className="module-readonly-note"><strong>Consulta docente</strong><p>{seleccionada.notas || 'Coordinación aún no ha registrado notas de seguimiento.'}</p></div>}
        </> : <div className="module-empty-state"><strong>Selecciona un caso</strong><p>Aquí podrás consultar su estado y acciones registradas.</p></div>}
      </aside>
    </div>
  </section>;
}
