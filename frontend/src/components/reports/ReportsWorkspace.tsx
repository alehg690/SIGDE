'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Estudiante } from '@/types/students';
import type {
  EstadoReporte,
  ManualConvivencia,
  Reporte,
  ReporteDetalle,
  ReporteFormData,
  TipoFalta,
} from '@/types/reports';

const TIPO_LABELS: Record<TipoFalta, string> = {
  TIPO_I: 'Tipo I',
  TIPO_II: 'Tipo II',
  TIPO_III: 'Tipo III',
};
const FORM_TO_MANUAL = { '1': 'Tipo I', '2': 'Tipo II', '3': 'Tipo III' } as const;
const ESTADO_LABELS: Record<EstadoReporte, string> = {
  Pendiente: 'Pendiente',
  EnRevision: 'En revisión',
  Cerrado: 'Cerrado',
  Anulado: 'Anulado',
};
const TRANSICIONES: Record<EstadoReporte, EstadoReporte[]> = {
  Pendiente: ['EnRevision', 'Cerrado', 'Anulado'],
  EnRevision: ['Pendiente', 'Cerrado', 'Anulado'],
  Cerrado: ['EnRevision'],
  Anulado: [],
};

type Feedback = { tipo: 'success' | 'error'; texto: string };
type Vista = 'consulta' | 'registro';
type Periodo = 'Todos' | '7' | '30' | 'mes';

function fechaLocalInput(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function crearFormularioVacio(): ReporteFormData {
  return {
    estudianteId: '',
    tipoFalta: '1',
    fechaHecho: fechaLocalInput(),
    lugar: '',
    situacion: '',
    descripcion: '',
    actuacionInicial: '',
    evidenciaUrl: '',
    confidencial: false,
  };
}

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function fechaLegible(value: string | null, soloFecha = false) {
  if (!value) return 'Sin registrar';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Fecha no disponible';
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    ...(soloFecha ? {} : { timeStyle: 'short' as const }),
    timeZone: 'America/Bogota',
  }).format(date);
}

function estadoClase(estado: EstadoReporte) {
  return estado.toLowerCase().replace('enrevision', 'revision');
}

function urlSegura(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export default function ReportsWorkspace({
  currentUserId,
  canManage,
  initialSearch = '',
}: {
  currentUserId: number;
  canManage: boolean;
  initialSearch?: string;
}) {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [manual, setManual] = useState<ManualConvivencia | null>(null);
  const [detalle, setDetalle] = useState<ReporteDetalle | null>(null);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>('consulta');
  const [form, setForm] = useState<ReporteFormData>(() => crearFormularioVacio());
  const [busqueda, setBusqueda] = useState(initialSearch);
  const [tipo, setTipo] = useState('Todos');
  const [estado, setEstado] = useState('Todos');
  const [docente, setDocente] = useState('Todos');
  const [curso, setCurso] = useState('Todos');
  const [periodo, setPeriodo] = useState<Periodo>('Todos');
  const [cargando, setCargando] = useState(true);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<Feedback | null>(null);

  useEffect(() => {
    if (!initialSearch) return;
    const timer = window.setTimeout(() => setBusqueda(initialSearch), 0);
    return () => window.clearTimeout(timer);
  }, [initialSearch]);

  const cargarDatos = useCallback(async (preferidoId?: number) => {
    const [reportesResponse, estudiantesResponse, manualResponse] = await Promise.all([
      fetch('/api/reportes', { cache: 'no-store' }),
      fetch('/api/estudiantes', { cache: 'no-store' }),
      fetch('/api/manual-convivencia', { cache: 'no-store' }),
    ]);
    if (!reportesResponse.ok) throw new Error(await leerError(reportesResponse, 'No se pudieron cargar los reportes.'));
    if (!estudiantesResponse.ok) throw new Error(await leerError(estudiantesResponse, 'No se pudieron cargar los estudiantes.'));
    if (!manualResponse.ok) throw new Error(await leerError(manualResponse, 'No se pudo cargar el manual de convivencia.'));

    const nuevosReportes = await reportesResponse.json() as Reporte[];
    const nuevosEstudiantes = await estudiantesResponse.json() as Estudiante[];
    setReportes(nuevosReportes);
    setEstudiantes(nuevosEstudiantes.filter((item) => item.activo && !item.archivado));
    setManual(await manualResponse.json() as ManualConvivencia);
    setSeleccionadoId((actual) => {
      const objetivo = preferidoId ?? actual;
      return nuevosReportes.some((item) => item.id === objetivo) ? objetivo : nuevosReportes[0]?.id ?? null;
    });
  }, []);

  const cargarDetalle = useCallback(async (id: number) => {
    setCargandoDetalle(true);
    try {
      const response = await fetch(`/api/reportes/${id}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo cargar el detalle del reporte.'));
      setDetalle(await response.json() as ReporteDetalle);
    } finally {
      setCargandoDetalle(false);
    }
  }, []);

  useEffect(() => {
    let activo = true;
    const timer = window.setTimeout(() => {
      void cargarDatos()
        .catch((error) => {
          if (activo) setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir el módulo.' });
        })
        .finally(() => { if (activo) setCargando(false); });
    }, 0);
    return () => { activo = false; window.clearTimeout(timer); };
  }, [cargarDatos]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!seleccionadoId) {
        setDetalle(null);
        return;
      }
      setDetalle(null);
      void cargarDetalle(seleccionadoId).catch((error) => {
        setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir el reporte.' });
      });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [cargarDetalle, seleccionadoId]);

  const estados = useMemo(() => [...new Set(reportes.map((item) => item.estado))].sort(), [reportes]);
  const docentes = useMemo(() => [...new Set(reportes.map((item) => item.docente))].sort((a, b) => a.localeCompare(b, 'es')), [reportes]);
  const cursos = useMemo(() => [...new Set(reportes.map((item) => `${item.grado}-${item.grupo}`))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })), [reportes]);
  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    const ahora = new Date();
    return reportes.filter((reporte) => {
      const contenido = [reporte.estudiante, reporte.docente, reporte.grado, reporte.grupo, reporte.descripcion, reporte.situacion, reporte.lugar].join(' ').toLocaleLowerCase('es');
      const fecha = new Date(reporte.fechaHecho || reporte.fecha);
      const dias = (ahora.getTime() - fecha.getTime()) / 86_400_000;
      const coincidePeriodo = periodo === 'Todos'
        || (periodo === 'mes' && fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth())
        || (periodo !== 'mes' && dias >= 0 && dias <= Number(periodo));
      return (!termino || contenido.includes(termino))
        && (tipo === 'Todos' || reporte.tipoFalta === tipo)
        && (estado === 'Todos' || reporte.estado === estado)
        && (docente === 'Todos' || reporte.docente === docente)
        && (curso === 'Todos' || `${reporte.grado}-${reporte.grupo}` === curso)
        && coincidePeriodo;
    });
  }, [busqueda, curso, docente, estado, periodo, reportes, tipo]);

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const response = await fetch('/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fechaHecho: new Date(form.fechaHecho).toISOString() }),
      });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo registrar el reporte.'));
      const creado = await response.json() as { id: number; avisos?: string[] };
      await cargarDatos(creado.id);
      setForm(crearFormularioVacio());
      setVista('consulta');
      setMensaje({
        tipo: 'success',
        texto: creado.avisos?.length
          ? `Reporte guardado. ${creado.avisos.join(' ')}`
          : 'Reporte registrado y trazabilidad iniciada correctamente.',
      });
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo registrar el reporte.' });
    } finally {
      setGuardando(false);
    }
  }

  async function refrescarReporte(id: number, texto: string) {
    await Promise.all([cargarDatos(id), cargarDetalle(id)]);
    setMensaje({ tipo: 'success', texto });
  }

  const pendientes = reportes.filter((item) => item.estado === 'Pendiente').length;
  const enRevision = reportes.filter((item) => item.estado === 'EnRevision').length;
  const esteMes = reportes.filter((item) => {
    const fecha = new Date(item.fecha);
    const actual = new Date();
    return fecha.getFullYear() === actual.getFullYear() && fecha.getMonth() === actual.getMonth();
  }).length;
  const hayFiltros = Boolean(busqueda || tipo !== 'Todos' || estado !== 'Todos' || docente !== 'Todos' || curso !== 'Todos' || periodo !== 'Todos');

  return <section className="workspace-panel reports-workspace">
    <header className="reports-heading">
      <div className="module-title"><h2>Reportes disciplinarios</h2><p>Documenta los hechos, conserva evidencias y acompaña el seguimiento institucional.</p></div>
      <div className="reports-view-switch" aria-label="Vista del módulo">
        <button type="button" className={vista === 'consulta' ? 'active' : ''} onClick={() => setVista('consulta')}>Consultar</button>
        <button type="button" className={vista === 'registro' ? 'active' : ''} onClick={() => setVista('registro')}>Nuevo reporte</button>
      </div>
    </header>
    {mensaje && <p className={`feedback ${mensaje.tipo}`} role={mensaje.tipo === 'error' ? 'alert' : 'status'}>{mensaje.texto}</p>}
    <div className="reports-summary" aria-label="Resumen de reportes">
      <article><span>Total visible</span><strong>{reportes.length}</strong><small>Según tus permisos</small></article>
      <article><span>Pendientes</span><strong>{pendientes}</strong><small>Esperan revisión</small></article>
      <article><span>En revisión</span><strong>{enRevision}</strong><small>Con seguimiento activo</small></article>
      <article><span>Este mes</span><strong>{esteMes}</strong><small>Nuevos registros</small></article>
    </div>
    {vista === 'registro'
      ? <ReportCreateForm form={form} setForm={setForm} estudiantes={estudiantes} manual={manual} guardando={guardando} onSubmit={registrar} onCancel={() => { setVista('consulta'); setMensaje(null); }} />
      : <div className="reports-consultation">
          <div className="reports-list-panel">
            <div className="reports-toolbar">
              <label className="reports-search"><span>Buscar reporte</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Estudiante, curso, docente o situación" /></label>
              <label><span>Tipo</span><select value={tipo} onChange={(event) => setTipo(event.target.value)}><option>Todos</option>{Object.entries(TIPO_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label><span>Estado</span><select value={estado} onChange={(event) => setEstado(event.target.value)}><option>Todos</option>{estados.map((item) => <option value={item} key={item}>{ESTADO_LABELS[item]}</option>)}</select></label>
              <label><span>Curso</span><select value={curso} onChange={(event) => setCurso(event.target.value)}><option>Todos</option>{cursos.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Periodo</span><select value={periodo} onChange={(event) => setPeriodo(event.target.value as Periodo)}><option value="Todos">Todo el historial</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="mes">Este mes</option></select></label>
              <label><span>{canManage ? 'Docente' : 'Autor'}</span><select value={docente} onChange={(event) => setDocente(event.target.value)}><option>Todos</option>{docentes.map((item) => <option key={item}>{item}</option>)}</select></label>
            </div>
            <div className="reports-list-heading"><strong>Registros</strong><span>{cargando ? 'Cargando...' : `${filtrados.length} resultados`}</span>{hayFiltros && <button type="button" onClick={() => { setBusqueda(''); setTipo('Todos'); setEstado('Todos'); setDocente('Todos'); setCurso('Todos'); setPeriodo('Todos'); }}>Limpiar filtros</button>}</div>
            <div className="reports-list" aria-live="polite">
              {!cargando && filtrados.length === 0 && <div className="reports-empty"><strong>Sin coincidencias</strong><p>Ajusta los filtros o registra una nueva situación.</p></div>}
              {filtrados.map((reporte) => <button type="button" key={reporte.id} className={seleccionadoId === reporte.id ? 'report-row report-row--active' : 'report-row'} onClick={() => setSeleccionadoId(reporte.id)}>
                <span className={`report-type report-type--${reporte.tipoFalta.toLowerCase()}`}>{TIPO_LABELS[reporte.tipoFalta]}</span>
                <span className="report-row-person"><strong>{reporte.estudiante}{Boolean(reporte.confidencial) && <em>Reservado</em>}</strong><small>{reporte.grado}-{reporte.grupo} · {reporte.situacion || 'Situación sin clasificar'}</small></span>
                <span className={`report-status report-status--${estadoClase(reporte.estado)}`}>{ESTADO_LABELS[reporte.estado]}</span>
                <span className="report-row-trace"><small>{reporte.docente}</small><time dateTime={reporte.fechaHecho || reporte.fecha}>{fechaLegible(reporte.fechaHecho || reporte.fecha)}</time></span>
              </button>)}
            </div>
          </div>
          <ReportDetail reporte={detalle} loading={cargandoDetalle} currentUserId={currentUserId} onUpdated={refrescarReporte} />
        </div>}
  </section>;
}

function ReportCreateForm({ form, setForm, estudiantes, manual, guardando, onSubmit, onCancel }: {
  form: ReporteFormData;
  setForm: (form: ReporteFormData) => void;
  estudiantes: Estudiante[];
  manual: ManualConvivencia | null;
  guardando: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const tipoManual = FORM_TO_MANUAL[form.tipoFalta];
  const regla = manual?.tipos.find((item) => item.tipo === tipoManual);
  const situaciones = manual?.situacionesTipificadas[tipoManual] ?? [];
  return <form className="report-create-form" onSubmit={onSubmit}>
    <div className="report-form-intro"><div><span>Nuevo registro</span><h3>Información verificable de la situación</h3><p>Registra hechos observables. La clasificación puede ser revisada por coordinación.</p></div><strong>Los campos con * son obligatorios</strong></div>
    <fieldset className="report-form-section"><legend><span>1</span> Contexto del hecho</legend><div className="report-form-grid">
      <label><span>Estudiante *</span><select value={form.estudianteId} onChange={(event) => setForm({ ...form, estudianteId: event.target.value })} required><option value="">Seleccionar estudiante</option>{estudiantes.map((item) => <option value={item.id} key={item.id}>{item.nombre} · {item.grado}-{item.grupo}</option>)}</select></label>
      <label><span>Fecha y hora del hecho *</span><input type="datetime-local" value={form.fechaHecho} max={fechaLocalInput()} onChange={(event) => setForm({ ...form, fechaHecho: event.target.value })} required /></label>
      <label><span>Lugar *</span><input value={form.lugar} minLength={3} maxLength={120} onChange={(event) => setForm({ ...form, lugar: event.target.value })} placeholder="Ej. Aula 11-2, patio central" required /></label>
      <label><span>Clasificación inicial *</span><select value={form.tipoFalta} onChange={(event) => setForm({ ...form, tipoFalta: event.target.value as ReporteFormData['tipoFalta'], situacion: '' })}><option value="1">Tipo I · Manejo pedagógico</option><option value="2">Tipo II · Atención de coordinación</option><option value="3">Tipo III · Activación prioritaria</option></select></label>
      <label className="report-situation-field"><span>Situación identificada *</span><select value={form.situacion} onChange={(event) => setForm({ ...form, situacion: event.target.value })} required><option value="">Seleccionar situación</option>{situaciones.map((item) => <option key={item}>{item}</option>)}<option value="Otra situación descrita en los hechos">Otra situación descrita en los hechos</option></select></label>
      {regla && <aside className={`report-rule-note report-rule-note--${form.tipoFalta}`}><strong>{regla.tipo} · {regla.articulo}</strong><p>{regla.descripcion}</p><small>Instancia sugerida: {regla.instancia}</small>{regla.requiereSiuce && <em>Requiere valoración institucional para SIUCE</em>}</aside>}
    </div></fieldset>
    <fieldset className="report-form-section"><legend><span>2</span> Relato y actuación</legend><div className="report-form-grid">
      <label className="report-description-field"><span>Descripción de los hechos *</span><textarea value={form.descripcion} minLength={20} maxLength={2000} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} placeholder="Indica qué ocurrió, cómo se observó y quiénes estuvieron presentes. Evita diagnósticos o juicios personales." required /><small>{form.descripcion.length}/2000 caracteres</small></label>
      <label className="report-description-field"><span>Actuación inicial realizada *</span><textarea value={form.actuacionInicial} minLength={3} maxLength={1000} onChange={(event) => setForm({ ...form, actuacionInicial: event.target.value })} placeholder="Ej. Se escucharon las partes, se detuvo la situación y se remitió a dirección de grupo." required /><small>{form.actuacionInicial.length}/1000 caracteres</small></label>
    </div></fieldset>
    <fieldset className="report-form-section"><legend><span>3</span> Evidencia y acceso</legend><div className="report-form-grid">
      <label className="report-evidence-field"><span>Enlace de evidencia inicial <small>Opcional</small></span><input type="url" value={form.evidenciaUrl} onChange={(event) => setForm({ ...form, evidenciaUrl: event.target.value })} placeholder="https://drive.google.com/..." /><small>Debe ser un enlace institucional con permisos controlados.</small></label>
      <label className="report-confidential-field"><input type="checkbox" checked={form.confidencial} onChange={(event) => setForm({ ...form, confidencial: event.target.checked })} /><span><strong>Acceso reservado</strong><small>Solo coordinación y quien registra podrán consultarlo.</small></span></label>
      <p className="report-notification-note"><strong>Notificación automática</strong><span>Al guardar, SIGDE registra un aviso para el acudiente y para el director de grupo cuando esté configurado.</span></p>
    </div></fieldset>
    <div className="report-form-actions"><button type="button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit" disabled={guardando || estudiantes.length === 0 || !manual}>{guardando ? 'Registrando...' : 'Registrar reporte'}</button></div>
  </form>;
}

function ReportDetail({ reporte, loading, currentUserId, onUpdated }: {
  reporte: ReporteDetalle | null;
  loading: boolean;
  currentUserId: number;
  onUpdated: (id: number, message: string) => Promise<void>;
}) {
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editForm, setEditForm] = useState({ fechaHecho: '', lugar: '', situacion: '', descripcion: '', actuacionInicial: '', confidencial: false });
  const [estado, setEstado] = useState<EstadoReporte>('Pendiente');
  const [justificacion, setJustificacion] = useState('');
  const [observacion, setObservacion] = useState('');
  const [evidencia, setEvidencia] = useState({ nombre: '', tipo: 'Documento', url: '' });
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!reporte) return;
    const timer = window.setTimeout(() => {
      setModoEdicion(false);
      setEditForm({
        fechaHecho: fechaLocalInput(new Date(reporte.fechaHecho || reporte.fecha)),
        lugar: reporte.lugar || '',
        situacion: reporte.situacion || '',
        descripcion: reporte.descripcion,
        actuacionInicial: reporte.actuacionInicial || '',
        confidencial: Boolean(reporte.confidencial),
      });
      setEstado(reporte.estado);
      setJustificacion('');
      setObservacion('');
      setEvidencia({ nombre: '', tipo: 'Documento', url: '' });
      setError('');
    }, 0);
    return () => window.clearTimeout(timer);
  }, [reporte]);

  async function ejecutar(accion: () => Promise<Response>, mensaje: string) {
    if (!reporte) return false;
    setGuardando(true);
    setError('');
    try {
      const response = await accion();
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo actualizar el reporte.'));
      await onUpdated(reporte.id, mensaje);
      return true;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo actualizar el reporte.');
      return false;
    } finally {
      setGuardando(false);
    }
  }

  async function guardarEdicion() {
    const guardado = await ejecutar(() => fetch(`/api/reportes/${reporte!.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, fechaHecho: new Date(editForm.fechaHecho).toISOString() }),
    }), 'Reporte corregido y cambio registrado en auditoría.');
    if (guardado) setModoEdicion(false);
  }

  async function guardarEstado() {
    const guardado = await ejecutar(() => fetch(`/api/reportes/${reporte!.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, observaciones: justificacion }),
    }), 'Estado del reporte actualizado correctamente.');
    if (guardado) setJustificacion('');
  }

  async function agregarObservacion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const guardado = await ejecutar(() => fetch(`/api/reportes/${reporte!.id}/observaciones`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: observacion }),
    }), 'Observación agregada al historial.');
    if (guardado) setObservacion('');
  }

  async function agregarEvidencia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const guardado = await ejecutar(() => fetch(`/api/reportes/${reporte!.id}/evidencias`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(evidencia),
    }), 'Evidencia vinculada al reporte.');
    if (guardado) setEvidencia({ nombre: '', tipo: 'Documento', url: '' });
  }

  if (loading) return <aside className="report-detail-panel report-detail-loading" aria-live="polite"><span /><span /><span /><p>Cargando trazabilidad...</p></aside>;
  if (!reporte) return <aside className="report-detail-panel"><div className="report-detail-empty"><strong>Selecciona un reporte</strong><p>Aquí podrás consultar hechos, evidencias, observaciones y seguimiento.</p></div></aside>;

  const estadosDisponibles = [reporte.estado, ...TRANSICIONES[reporte.estado]];
  return <aside className="report-detail-panel">
    <div className="report-detail-heading"><div><span>Reporte #{reporte.id}</span><h3>{reporte.estudiante}</h3><p>{reporte.grado}-{reporte.grupo} · {reporte.docenteId === currentUserId ? 'Registrado por ti' : reporte.docente}</p></div><div className="report-detail-badges"><span className={`report-type report-type--${reporte.tipoFalta.toLowerCase()}`}>{TIPO_LABELS[reporte.tipoFalta]}</span>{Boolean(reporte.confidencial) && <span className="report-private-badge">Reservado</span>}</div></div>
    <dl className="report-metadata"><div><dt>Estado</dt><dd><span className={`report-status report-status--${estadoClase(reporte.estado)}`}>{ESTADO_LABELS[reporte.estado]}</span></dd></div><div><dt>Hecho ocurrido</dt><dd>{fechaLegible(reporte.fechaHecho || reporte.fecha)}</dd></div><div><dt>Lugar</dt><dd>{reporte.lugar || 'Sin registrar'}</dd></div><div><dt>Registrado</dt><dd>{fechaLegible(reporte.fecha)}</dd></div></dl>
    {error && <p className="report-detail-error" role="alert">{error}</p>}
    {modoEdicion ? <div className="report-detail-editor">
      <label><span>Fecha y hora</span><input type="datetime-local" value={editForm.fechaHecho} max={fechaLocalInput()} onChange={(event) => setEditForm({ ...editForm, fechaHecho: event.target.value })} /></label>
      <label><span>Lugar</span><input value={editForm.lugar} onChange={(event) => setEditForm({ ...editForm, lugar: event.target.value })} /></label>
      <label><span>Situación</span><input value={editForm.situacion} onChange={(event) => setEditForm({ ...editForm, situacion: event.target.value })} /></label>
      <label><span>Descripción</span><textarea minLength={20} maxLength={2000} value={editForm.descripcion} onChange={(event) => setEditForm({ ...editForm, descripcion: event.target.value })} /></label>
      <label><span>Actuación inicial</span><textarea minLength={3} maxLength={1000} value={editForm.actuacionInicial} onChange={(event) => setEditForm({ ...editForm, actuacionInicial: event.target.value })} /></label>
      <label className="report-editor-private"><input type="checkbox" checked={editForm.confidencial} onChange={(event) => setEditForm({ ...editForm, confidencial: event.target.checked })} /><span>Acceso reservado</span></label>
      <div><button type="button" onClick={() => setModoEdicion(false)}>Cancelar</button><button type="button" className="primary-button" disabled={guardando || editForm.descripcion.trim().length < 20} onClick={() => void guardarEdicion()}>{guardando ? 'Guardando...' : 'Guardar corrección'}</button></div>
    </div> : <>
      <div className="report-detail-copy"><span>Situación identificada</span><strong>{reporte.situacion || 'Sin clasificación específica'}</strong></div>
      <div className="report-detail-copy"><span>Descripción de los hechos</span><p>{reporte.descripcion}</p></div>
      <div className="report-detail-copy"><span>Actuación inicial</span><p>{reporte.actuacionInicial || 'No registrada'}</p></div>
    </>}
    {!modoEdicion && reporte.permisos.puedeEditar && <button type="button" className="report-edit-button" onClick={() => setModoEdicion(true)}>Corregir reporte <small>Disponible hasta {fechaLegible(reporte.editableHasta)}</small></button>}

    <section className="report-trace-section"><header><div><span>Evidencias</span><strong>{reporte.evidencias.length}</strong></div>{reporte.permisos.puedeAgregarEvidencia && <small>Enlaces institucionales</small>}</header>
      <div className="report-evidence-list">{reporte.evidencias.length ? reporte.evidencias.map((item) => urlSegura(item.url) && <a href={item.url} target="_blank" rel="noreferrer" key={item.id}><span>{item.tipo}</span><strong>{item.nombre}</strong><small>{fechaLegible(item.creadoEn)}</small></a>) : <p>Sin evidencias vinculadas.</p>}</div>
      {reporte.permisos.puedeAgregarEvidencia && <details className="report-inline-form"><summary>Vincular evidencia</summary><form onSubmit={agregarEvidencia}><label><span>Nombre</span><input value={evidencia.nombre} minLength={2} maxLength={120} onChange={(event) => setEvidencia({ ...evidencia, nombre: event.target.value })} required /></label><label><span>Tipo</span><select value={evidencia.tipo} onChange={(event) => setEvidencia({ ...evidencia, tipo: event.target.value })}><option>Documento</option><option>Imagen</option><option>Video</option><option>Audio</option><option>Otro</option></select></label><label className="wide"><span>Enlace</span><input type="url" value={evidencia.url} onChange={(event) => setEvidencia({ ...evidencia, url: event.target.value })} required /></label><button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Agregar evidencia'}</button></form></details>}
    </section>

    <section className="report-trace-section"><header><div><span>Historial de observaciones</span><strong>{reporte.observacionesLista.length}</strong></div></header>
      <ol className="report-timeline">{reporte.observacionesLista.length ? reporte.observacionesLista.map((item) => <li key={item.id}><i /><div><strong>{item.usuario}<small>{item.rol}</small></strong><time dateTime={item.creadoEn}>{fechaLegible(item.creadoEn)}</time><p>{item.texto}</p></div></li>) : <li className="report-timeline-empty">Todavía no hay observaciones.</li>}</ol>
      {reporte.permisos.puedeObservar && <form className="report-observation-form" onSubmit={agregarObservacion}><label><span>Nueva observación</span><textarea value={observacion} minLength={4} maxLength={1500} onChange={(event) => setObservacion(event.target.value)} placeholder="Registra un compromiso, aclaración o avance verificable." required /></label><button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Agregar al historial'}</button></form>}
    </section>

    {reporte.notificaciones.length > 0 && <section className="report-trace-section"><header><div><span>Notificaciones</span><strong>{reporte.notificaciones.length}</strong></div></header><ul className="report-notification-list">{reporte.notificaciones.map((item) => <li key={`${item.destinatarioTipo}-${item.id}`}><span>{item.canal === 'email' ? 'Correo' : 'Aplicación'}</span><div><strong>{item.destinatario}</strong><small>{item.destinatarioTipo} · {fechaLegible(item.enviadoEn)}</small></div></li>)}</ul></section>}

    {reporte.permisos.puedeGestionarEstado && <section className="report-status-editor"><h4>Gestión de coordinación</h4><p>Los cierres y anulaciones requieren una justificación que quedará en el historial.</p><label><span>Nuevo estado</span><select value={estado} onChange={(event) => setEstado(event.target.value as EstadoReporte)}>{estadosDisponibles.map((item) => <option value={item} key={item}>{ESTADO_LABELS[item]}</option>)}</select></label><label><span>Justificación o decisión</span><textarea value={justificacion} maxLength={1500} onChange={(event) => setJustificacion(event.target.value)} placeholder="Describe la decisión, los compromisos o el motivo de cierre." /></label><button type="button" className="module-primary-action" disabled={guardando || (estado === reporte.estado && !justificacion.trim())} onClick={() => void guardarEstado()}>{guardando ? 'Guardando...' : 'Actualizar gestión'}</button></section>}
  </aside>;
}
