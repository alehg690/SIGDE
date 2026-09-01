'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Estudiante } from '@/types/students';
import type { Reporte, ReporteFormData, TipoFalta } from '@/types/reports';

const EMPTY_FORM: ReporteFormData = { estudianteId: '', tipoFalta: '1', descripcion: '', evidenciaUrl: '', confidencial: false };
const TIPO_LABELS: Record<TipoFalta, string> = { TIPO_I: 'Tipo I', TIPO_II: 'Tipo II', TIPO_III: 'Tipo III' };
type Feedback = { tipo: 'success' | 'error'; texto: string };
type Vista = 'consulta' | 'registro';

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function fechaLegible(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(date);
}

function estaPendiente(estado: string) {
  return estado.trim().toLocaleLowerCase('es') === 'pendiente';
}

function evidenciaSegura(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? value : null;
  } catch {
    return null;
  }
}

export default function ReportsWorkspace({ currentUserId, canManage, initialSearch = '' }: { currentUserId: number; canManage: boolean; initialSearch?: string }) {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>('consulta');
  const [form, setForm] = useState<ReporteFormData>(EMPTY_FORM);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('Todos');
  const [estado, setEstado] = useState('Todos');
  const [docente, setDocente] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!initialSearch) return;
    const timer = window.setTimeout(() => setBusqueda(initialSearch), 0);
    return () => window.clearTimeout(timer);
  }, [initialSearch]);

  const cargarDatos = useCallback(async (preferidoId?: number) => {
    const [reportesResponse, estudiantesResponse] = await Promise.all([
      fetch('/api/reportes', { cache: 'no-store' }),
      fetch('/api/estudiantes', { cache: 'no-store' }),
    ]);
    if (!reportesResponse.ok) throw new Error(await leerError(reportesResponse, 'No se pudieron cargar los reportes.'));
    if (!estudiantesResponse.ok) throw new Error(await leerError(estudiantesResponse, 'No se pudieron cargar los estudiantes.'));

    const nuevosReportes = await reportesResponse.json() as Reporte[];
    const nuevosEstudiantes = await estudiantesResponse.json() as Estudiante[];
    setReportes(nuevosReportes);
    setEstudiantes(nuevosEstudiantes.filter((item) => item.activo && !item.archivado));
    setSeleccionadoId((actual) => {
      const objetivo = preferidoId ?? actual;
      return nuevosReportes.some((item) => item.id === objetivo) ? objetivo : nuevosReportes[0]?.id ?? null;
    });
  }, []);

  useEffect(() => {
    let activo = true;
    async function iniciar() {
      try {
        await cargarDatos();
      } catch (error) {
        if (activo) setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir el módulo.' });
      } finally {
        if (activo) setCargando(false);
      }
    }
    void iniciar();
    return () => { activo = false; };
  }, [cargarDatos]);

  const estados = useMemo(() => [...new Set(reportes.map((item) => item.estado))].sort((a, b) => a.localeCompare(b, 'es')), [reportes]);
  const docentes = useMemo(() => [...new Set(reportes.map((item) => item.docente))].sort((a, b) => a.localeCompare(b, 'es')), [reportes]);
  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    return reportes.filter((reporte) => {
      const contenido = [reporte.estudiante, reporte.docente, reporte.grado, reporte.grupo, reporte.descripcion].join(' ').toLocaleLowerCase('es');
      return (!termino || contenido.includes(termino))
        && (tipo === 'Todos' || reporte.tipoFalta === tipo)
        && (estado === 'Todos' || reporte.estado === estado)
        && (docente === 'Todos' || reporte.docente === docente);
    });
  }, [busqueda, docente, estado, reportes, tipo]);
  const seleccionado = reportes.find((item) => item.id === seleccionadoId) ?? null;

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const response = await fetch('/api/reportes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo registrar el reporte.'));
      const creado = await response.json() as { id: number };
      await cargarDatos(creado.id);
      setForm(EMPTY_FORM);
      setVista('consulta');
      setMensaje({ tipo: 'success', texto: 'Reporte registrado correctamente.' });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo registrar el reporte.' });
    } finally {
      setGuardando(false);
    }
  }

  const pendientes = reportes.filter((item) => estaPendiente(item.estado)).length;
  const estudiantesReportados = new Set(reportes.map((item) => item.estudianteId)).size;
  const esteMes = reportes.filter((item) => {
    const fecha = new Date(item.fecha);
    const actual = new Date();
    return fecha.getFullYear() === actual.getFullYear() && fecha.getMonth() === actual.getMonth();
  }).length;

  return <section className="workspace-panel reports-workspace">
    <header className="reports-heading">
      <div className="module-title"><h2>Reportes disciplinarios</h2><p>Registra situaciones de convivencia y consulta su trazabilidad.</p></div>
      <div className="reports-view-switch" aria-label="Vista del módulo">
        <button type="button" className={vista === 'consulta' ? 'active' : ''} onClick={() => setVista('consulta')}>Consultar</button>
        <button type="button" className={vista === 'registro' ? 'active' : ''} onClick={() => setVista('registro')}>Registrar</button>
      </div>
    </header>
    {mensaje && <p className={`feedback ${mensaje.tipo}`} role="status">{mensaje.texto}</p>}
    <div className="reports-summary" aria-label="Resumen de reportes">
      <article><span>Total</span><strong>{reportes.length}</strong><small>Reportes registrados</small></article>
      <article><span>Pendientes</span><strong>{pendientes}</strong><small>Requieren seguimiento</small></article>
      <article><span>Este mes</span><strong>{esteMes}</strong><small>Actividad reciente</small></article>
      <article><span>Estudiantes</span><strong>{estudiantesReportados}</strong><small>Con historial</small></article>
    </div>
    {vista === 'registro'
      ? <ReportCreateForm form={form} setForm={setForm} estudiantes={estudiantes} guardando={guardando} onSubmit={registrar} onCancel={() => { setVista('consulta'); setMensaje(null); }} />
      : <div className="reports-consultation">
          <div className="reports-list-panel">
            <div className="reports-toolbar">
              <label className="reports-search"><span>Buscar reporte</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Estudiante, docente, curso o descripción" /></label>
              <label><span>Tipo</span><select value={tipo} onChange={(event) => setTipo(event.target.value)}><option>Todos</option>{Object.entries(TIPO_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label><span>Estado</span><select value={estado} onChange={(event) => setEstado(event.target.value)}><option>Todos</option>{estados.map((item) => <option key={item}>{item}</option>)}</select></label>
              {canManage && <label><span>Docente</span><select value={docente} onChange={(event) => setDocente(event.target.value)}><option>Todos</option>{docentes.map((item) => <option key={item}>{item}</option>)}</select></label>}
            </div>
            <div className="reports-list-heading"><strong>Registros</strong><span>{cargando ? 'Cargando...' : `${filtrados.length} resultados`}</span></div>
            <div className="reports-list" aria-live="polite">
              {!cargando && filtrados.length === 0 && <p className="reports-empty">No hay reportes que coincidan con los filtros.</p>}
              {filtrados.map((reporte) => <button type="button" key={reporte.id} className={seleccionado?.id === reporte.id ? 'report-row report-row--active' : 'report-row'} onClick={() => setSeleccionadoId(reporte.id)}><span className={`report-type report-type--${reporte.tipoFalta.toLowerCase()}`}>{TIPO_LABELS[reporte.tipoFalta]}</span><span><strong>{reporte.estudiante}</strong><small>{reporte.grado}-{reporte.grupo} · {reporte.docente}</small></span><span className={`report-status report-status--${estaPendiente(reporte.estado) ? 'pending' : 'managed'}`}>{reporte.estado}</span><time dateTime={reporte.fecha}>{fechaLegible(reporte.fecha)}</time></button>)}
            </div>
          </div>
          <ReportDetail reporte={seleccionado} currentUserId={currentUserId} canManage={canManage} onUpdated={async (id, texto) => { await cargarDatos(id); setMensaje({ tipo: 'success', texto }); }} />
        </div>}
  </section>;
}

function ReportCreateForm({ form, setForm, estudiantes, guardando, onSubmit, onCancel }: {
  form: ReporteFormData;
  setForm: (form: ReporteFormData) => void;
  estudiantes: Estudiante[];
  guardando: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return <form className="report-create-form" onSubmit={onSubmit}>
    <div className="report-form-intro"><div><span>Nuevo registro</span><h3>Información de la situación</h3><p>Describe únicamente hechos relevantes y verificables.</p></div><strong>Los campos con * son obligatorios</strong></div>
    <div className="report-form-grid">
      <label><span>Estudiante *</span><select value={form.estudianteId} onChange={(event) => setForm({ ...form, estudianteId: event.target.value })} required><option value="">Seleccionar estudiante</option>{estudiantes.map((item) => <option value={item.id} key={item.id}>{item.nombre} · {item.grado}-{item.grupo}</option>)}</select></label>
      <label><span>Tipo de situación *</span><select value={form.tipoFalta} onChange={(event) => setForm({ ...form, tipoFalta: event.target.value as ReporteFormData['tipoFalta'] })}><option value="1">Tipo I · Situación leve</option><option value="2">Tipo II · Situación grave</option><option value="3">Tipo III · Presunta conducta delictiva</option></select></label>
      <label className="report-description-field"><span>Descripción de los hechos *</span><textarea value={form.descripcion} minLength={10} maxLength={1500} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} placeholder="Indica qué ocurrió, cuándo y dónde, con lenguaje claro y respetuoso." required /><small>{form.descripcion.length}/1500 caracteres</small></label>
      <label className="report-evidence-field"><span>Enlace de evidencia (opcional)</span><input type="url" value={form.evidenciaUrl} onChange={(event) => setForm({ ...form, evidenciaUrl: event.target.value })} placeholder="https://..." /><small>Usa únicamente archivos institucionales autorizados.</small></label>
      <label className="report-confidential-field"><input type="checkbox" checked={form.confidencial} onChange={(event) => setForm({ ...form, confidencial: event.target.checked })} /><span><strong>Reporte confidencial</strong><small>Restringe su tratamiento a personal autorizado.</small></span></label>
    </div>
    <div className="report-form-actions"><button type="button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit" disabled={guardando || estudiantes.length === 0}>{guardando ? 'Registrando...' : 'Registrar reporte'}</button></div>
  </form>;
}

function ReportDetail({ reporte, currentUserId, canManage, onUpdated }: {
  reporte: Reporte | null;
  currentUserId: number;
  canManage: boolean;
  onUpdated: (id: number, message: string) => Promise<void>;
}) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [descripcion, setDescripcion] = useState('');
  const [evidencia, setEvidencia] = useState('');
  const [estado, setEstado] = useState('Pendiente');
  const [observaciones, setObservaciones] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [instanteMontaje] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setModoEdicion(false);
      setDescripcion(reporte?.descripcion ?? '');
      setEvidencia(reporte?.evidenciaUrl ?? '');
      setEstado(reporte?.estado ?? 'Pendiente');
      setObservaciones(reporte?.observaciones ?? '');
      setError('');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reporte]);

  const evidenciaUrl = reporte ? evidenciaSegura(reporte.evidenciaUrl) : null;
  const puedeEditar = Boolean(reporte && reporte.docenteId === currentUserId && estaPendiente(reporte.estado) && reporte.editableHasta && new Date(reporte.editableHasta).getTime() > instanteMontaje);

  async function guardarEdicion() {
    if (!reporte) return;
    setGuardando(true); setError('');
    try {
      const response = await fetch(`/api/reportes/${reporte.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ descripcion, evidenciaUrl: evidencia }) });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo editar el reporte.'));
      setModoEdicion(false);
      await onUpdated(reporte.id, 'Reporte actualizado correctamente.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo editar el reporte.');
    } finally { setGuardando(false); }
  }

  async function guardarEstado() {
    if (!reporte) return;
    setGuardando(true); setError('');
    try {
      const response = await fetch(`/api/reportes/${reporte.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado, observaciones }) });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo actualizar el estado.'));
      await onUpdated(reporte.id, 'Estado y observaciones actualizados.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar el estado.');
    } finally { setGuardando(false); }
  }

  return <aside className="report-detail-panel">
    {reporte ? <>
      <div className="report-detail-heading"><div><span>Reporte #{reporte.id}</span><h3>{reporte.estudiante}</h3><p>{reporte.grado}-{reporte.grupo}</p></div><span className={`report-type report-type--${reporte.tipoFalta.toLowerCase()}`}>{TIPO_LABELS[reporte.tipoFalta]}</span></div>
      <dl className="report-metadata"><div><dt>Estado</dt><dd>{reporte.estado}</dd></div><div><dt>Registrado por</dt><dd>{reporte.docente}</dd></div><div><dt>Fecha</dt><dd>{fechaLegible(reporte.fecha)}</dd></div><div><dt>Acceso</dt><dd>{Boolean(reporte.confidencial) ? 'Confidencial' : 'Institucional'}</dd></div></dl>
      {error && <p className="report-detail-error" role="alert">{error}</p>}
      {modoEdicion ? <div className="report-detail-editor"><label><span>Descripción</span><textarea minLength={10} maxLength={1500} value={descripcion} onChange={(event) => setDescripcion(event.target.value)} /></label><label><span>Enlace de evidencia</span><input type="url" value={evidencia} onChange={(event) => setEvidencia(event.target.value)} placeholder="https://..." /></label><div><button type="button" onClick={() => setModoEdicion(false)}>Cancelar</button><button type="button" className="primary-button" disabled={guardando || descripcion.trim().length < 10} onClick={() => void guardarEdicion()}>{guardando ? 'Guardando...' : 'Guardar edición'}</button></div></div> : <div className="report-detail-copy"><span>Descripción</span><p>{reporte.descripcion}</p></div>}
      {reporte.observaciones && <div className="report-detail-copy"><span>Observaciones</span><p>{reporte.observaciones}</p></div>}
      {evidenciaUrl ? <a className="report-evidence-link" href={evidenciaUrl} target="_blank" rel="noreferrer">Abrir evidencia</a> : <p className="report-no-evidence">Sin evidencia adjunta</p>}
      {!modoEdicion && puedeEditar && <button type="button" className="report-edit-button" onClick={() => setModoEdicion(true)}>Editar reporte <small>Disponible hasta {fechaLegible(reporte.editableHasta || '')}</small></button>}
      {canManage && <div className="report-status-editor"><h4>Gestión de coordinación</h4><label><span>Estado</span><select value={estado} onChange={(event) => setEstado(event.target.value)}><option value="Pendiente">Pendiente</option><option value="EnRevision">En revisión</option><option value="Cerrado">Cerrado</option><option value="Anulado">Anulado</option></select></label><label><span>Observaciones</span><textarea value={observaciones} maxLength={1500} onChange={(event) => setObservaciones(event.target.value)} placeholder="Registra decisiones, compromisos o cierre del caso." /></label><button type="button" className="module-primary-action" disabled={guardando} onClick={() => void guardarEstado()}>{guardando ? 'Guardando...' : 'Actualizar gestión'}</button></div>}
    </> : <div className="report-detail-empty"><strong>Selecciona un reporte</strong><p>Aquí podrás consultar toda la información registrada.</p></div>}
  </aside>;
}
