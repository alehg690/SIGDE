'use client';

import StudentSearch from './StudentSearch';
import { parseReportDate } from '@/lib/report-dates';
import { coincideBusqueda } from '@/lib/search-normalization';
import ObservadorFields, { observadorVacio, ObservadorDetalle } from './ObservadorFields';
import type { Observador } from '@backend/types/observador';
import { DragEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Estudiante } from '@/types/students';
import type {
  EstadoReporte,
  Reporte,
  ReporteDetalle,
  ReporteFormData,
  TipoFalta,
} from '@/types/reports';
import ModuleHeader from '@/components/ui/ModuleHeader';
import KpiGrid from '@/components/ui/KpiGrid';

const TIPO_LABELS: Record<TipoFalta, string> = {
  ACADEMICA: 'Académica',
  TIPO_I: 'Tipo I',
  TIPO_II: 'Tipo II',
  TIPO_III: 'Tipo III',
};
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
const EVIDENCE_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.docx';
const EVIDENCE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const MAX_EVIDENCE_SIZE = 4 * 1024 * 1024;
const MAX_EVIDENCE_FILES = 5;

type Feedback = { tipo: 'success' | 'error'; texto: string };
type Vista = 'consulta' | 'registro';
type Periodo = 'Todos' | '7' | '30' | 'mes';

function fechaLocalInput(value = new Date()) {
  const local = new Date(value.getTime() - value.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function crearFormularioVacio(): ReporteFormData {
  return {
    observador: observadorVacio(),
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
  const date = parseReportDate(value);
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

function EvidencePreview({ file, onRemove, disabled }: { file: File; onRemove: () => void; disabled: boolean }) {
  const previewUrl = useMemo(() => file.type.startsWith('image/') ? URL.createObjectURL(file) : '', [file]);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);
  return <article className="report-upload-preview">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    {previewUrl ? <img src={previewUrl} alt={`Vista previa de ${file.name}`} /> : <span className="report-upload-filetype" aria-hidden="true">{file.name.split('.').pop()?.toUpperCase() || 'DOC'}</span>}
    <div><strong>{file.name}</strong><small>{(file.size / 1024 / 1024).toFixed(2)} MB · listo para adjuntar</small></div>
    <button type="button" disabled={disabled} onClick={onRemove}>Quitar</button>
  </article>;
}

function EvidenceUpload({ files, onChange, disabled = false }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 5_000);
    return () => window.clearTimeout(timer);
  }, [error]);

  function selectFiles(next: File[]) {
    setDragging(false);
    if (!next.length) return;
    if (next.some((file) => !EVIDENCE_TYPES.has(file.type) || file.size > MAX_EVIDENCE_SIZE)) {
      setError('Todos los archivos deben ser PDF, JPG, PNG, WebP o DOCX de máximo 4 MB.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    const unique = [...files];
    for (const file of next) {
      if (!unique.some((current) => current.name === file.name && current.size === file.size && current.lastModified === file.lastModified)) unique.push(file);
    }
    if (unique.length > MAX_EVIDENCE_FILES) {
      setError(`Puedes adjuntar máximo ${MAX_EVIDENCE_FILES} archivos por carga.`);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    setError('');
    onChange(unique);
    if (inputRef.current) inputRef.current.value = '';
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    if (!disabled) selectFiles(Array.from(event.dataTransfer.files));
  }

  return <div className="report-upload">
    <div
      className={`report-upload-zone${dragging ? ' report-upload-zone--dragging' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); if (!disabled) setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept={EVIDENCE_ACCEPT} multiple disabled={disabled} onChange={(event) => selectFiles(Array.from(event.target.files ?? []))} />
      <span className="report-upload-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 6.5A2.5 2.5 0 0 1 5.5 4h4l2 2h7A2.5 2.5 0 0 1 21 8.5v9A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z"/><path d="M12 16v-6m0 0-2.5 2.5M12 10l2.5 2.5"/></svg></span>
      <strong>{dragging ? 'Suelta los archivos aquí' : 'Arrastra tus archivos para adjuntarlos'}</strong>
      <small>Hasta 5 archivos PDF, JPG, PNG, WebP o DOCX · máximo 4 MB cada uno</small>
      <button type="button" disabled={disabled} onClick={() => inputRef.current?.click()}>Seleccionar archivos</button>
    </div>
    {files.length > 0 && <div className="report-upload-previews">{files.map((file, index) => <EvidencePreview key={`${file.name}-${file.size}-${file.lastModified}`} file={file} disabled={disabled} onRemove={() => onChange(files.filter((_, current) => current !== index))} />)}</div>}
    {error && <p className="report-upload-error" role="alert">{error}</p>}
  </div>;
}

function urlSegura(value: string) {
  if (/^\/api\/reportes\/\d+\/evidencias\/\d+\/archivo$/.test(value)) return true;
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
  estudianteId,
}: {
  currentUserId: number;
  canManage: boolean;
  initialSearch?: string;
  estudianteId?: number;
}) {
  const [reportes, setReportes] = useState<Reporte[]>([]);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const detalleSolicitud = useRef(0);
  const enviando = useRef(false);
  const consultaHistorial = estudianteId === undefined ? '' : `?estudianteId=${estudianteId}`;
  const [detalle, setDetalle] = useState<ReporteDetalle | null>(null);
  const [seleccionadoId, setSeleccionadoId] = useState<number | null>(null);
  const [vista, setVista] = useState<Vista>('consulta');
  const [form, setForm] = useState<ReporteFormData>(() => crearFormularioVacio());
  const [archivos, setArchivos] = useState<File[]>([]);
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
    if (!mensaje) return;
    const timer = window.setTimeout(() => setMensaje(null), 5_000);
    return () => window.clearTimeout(timer);
  }, [mensaje]);

  useEffect(() => {
    if (!initialSearch) return;
    const timer = window.setTimeout(() => setBusqueda(initialSearch), 0);
    return () => window.clearTimeout(timer);
  }, [initialSearch]);

  const cargarDatos = useCallback(async (preferidoId?: number) => {
    const [reportesResponse, estudiantesResponse] = await Promise.all([
      fetch(`/api/reportes${consultaHistorial}`, { cache: 'no-store' }),
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
      return objetivo && nuevosReportes.some((item) => item.id === objetivo) ? objetivo : null;
    });
  }, [consultaHistorial]);

  const cargarDetalle = useCallback(async (id: number) => {
    const solicitud = ++detalleSolicitud.current;
    setCargandoDetalle(true);
    try {
      const response = await fetch(`/api/reportes/${id}${consultaHistorial}`, { cache: 'no-store' });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo cargar el detalle del reporte.'));
      const nuevoDetalle = await response.json() as ReporteDetalle;
      if (solicitud === detalleSolicitud.current) setDetalle(nuevoDetalle);
    } catch (error) {
      if (solicitud === detalleSolicitud.current) throw error;
    } finally {
      if (solicitud === detalleSolicitud.current) setCargandoDetalle(false);
    }
  }, [consultaHistorial]);

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
        setCargandoDetalle(false);
        setDetalle(null);
        return;
      }
      setDetalle(null);
      void cargarDetalle(seleccionadoId).catch((error) => {
        setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir el reporte.' });
      });
    }, 0);
    return () => { detalleSolicitud.current += 1; window.clearTimeout(timer); };
  }, [cargarDetalle, seleccionadoId]);

  useEffect(() => {
    if (!seleccionadoId) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSeleccionadoId(null); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [seleccionadoId]);

  const estados = useMemo(() => [...new Set(reportes.map((item) => item.estado))].sort(), [reportes]);
  const docentes = useMemo(() => [...new Set(reportes.map((item) => item.docente))].sort((a, b) => a.localeCompare(b, 'es')), [reportes]);
  const cursos = useMemo(() => [...new Set(reportes.map((item) => `${item.grado}-${item.grupo}`))].sort((a, b) => a.localeCompare(b, 'es', { numeric: true })), [reportes]);
  const filtrados = useMemo(() => {
    const ahora = new Date();
    return reportes.filter((reporte) => {
      const fecha = parseReportDate(reporte.fechaHecho || reporte.fecha);
      const dias = (ahora.getTime() - fecha.getTime()) / 86_400_000;
      const coincidePeriodo = periodo === 'Todos'
        || (periodo === 'mes' && fecha.getFullYear() === ahora.getFullYear() && fecha.getMonth() === ahora.getMonth())
        || (periodo !== 'mes' && dias >= 0 && dias <= Number(periodo));
      return coincideBusqueda(busqueda, [reporte.estudiante, reporte.docente, reporte.grado, reporte.grupo, reporte.descripcion, reporte.situacion, reporte.lugar])
        && (tipo === 'Todos' || reporte.tipoFalta === tipo)
        && (estado === 'Todos' || reporte.estado === estado)
        && (docente === 'Todos' || reporte.docente === docente)
        && (curso === 'Todos' || `${reporte.grado}-${reporte.grupo}` === curso)
        && coincidePeriodo;
    });
  }, [busqueda, curso, docente, estado, periodo, reportes, tipo]);

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (enviando.current) return;
    if (archivos.length > MAX_EVIDENCE_FILES || archivos.some((archivo) => archivo.size > MAX_EVIDENCE_SIZE || !EVIDENCE_TYPES.has(archivo.type))) {
      setMensaje({ tipo: 'error', texto: 'Adjunta hasta cinco archivos PDF, imagen o DOCX de máximo 4 MB cada uno.' });
      return;
    }
    enviando.current = true;
    setGuardando(true);
    setMensaje(null);
    try {
      const ahora = new Date();
      const fechaEquipo = fechaLocalInput(ahora);
      const response = await fetch('/api/reportes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fechaHecho: ahora.toISOString(), observador: {
          ...form.observador, fecha: fechaEquipo.slice(0, 10), horaInicio: fechaEquipo.slice(11, 16), horaFinal: '',
        } }),
      });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo registrar el reporte.'));
      const creado = await response.json() as { id: number; avisos?: string[] };
      const archivosFallidos: string[] = [];
      for (const archivo of archivos) {
        const adjunto = new FormData();
        adjunto.set('archivo', archivo);
        const subida = await fetch(`/api/reportes/${creado.id}/evidencias/archivo`, { method: 'POST', body: adjunto }).catch(() => null);
        if (!subida?.ok) archivosFallidos.push(archivo.name);
      }
      const avisoArchivo = archivosFallidos.length ? ` El reporte se guardó, pero no se pudieron adjuntar: ${archivosFallidos.join(', ')}.` : '';
      setForm(crearFormularioVacio());
      setArchivos([]);
      setVista('consulta');
      setBusqueda(''); setTipo('Todos'); setEstado('Todos'); setDocente('Todos'); setCurso('Todos'); setPeriodo('Todos');
      setMensaje({
        tipo: 'success',
        texto: creado.avisos?.length
          ? `Reporte guardado. ${creado.avisos.join(' ')}${avisoArchivo}`
          : `Reporte registrado y trazabilidad iniciada correctamente.${avisoArchivo}`,
      });
      try {
        await cargarDatos(creado.id);
      } catch {
        setMensaje({ tipo: 'success', texto: `Reporte #${creado.id} guardado. No se pudo actualizar la lista; vuelve a abrir el módulo para consultarlo. ${creado.avisos?.join(' ') ?? ''}`.trim() });
      }
    } catch (error) {
      setMensaje({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo registrar el reporte.' });
    } finally {
      enviando.current = false;
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
    const fecha = parseReportDate(item.fecha);
    const actual = new Date();
    return fecha.getFullYear() === actual.getFullYear() && fecha.getMonth() === actual.getMonth();
  }).length;
  const hayFiltros = Boolean(busqueda || tipo !== 'Todos' || estado !== 'Todos' || docente !== 'Todos' || curso !== 'Todos' || periodo !== 'Todos');

  return <section className="workspace-panel reports-workspace">
    <ModuleHeader icon={<svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5m-5 3h5"/></svg>} kicker="Seguimiento institucional" title={estudianteId === undefined ? 'Reportes disciplinarios' : 'Historial de reportes del estudiante'} description="Documenta los hechos, conserva evidencias y acompaña el seguimiento institucional." action={estudianteId === undefined ? <div className="reports-view-switch" aria-label="Vista del módulo">
        <button type="button" className={vista === 'consulta' ? 'active' : ''} onClick={() => setVista('consulta')}>Consultar</button>
        <button type="button" className={vista === 'registro' ? 'active' : ''} onClick={() => setVista('registro')}>Nuevo reporte</button>
      </div> : undefined} />
    {mensaje && <p className={`feedback ${mensaje.tipo}`} role={mensaje.tipo === 'error' ? 'alert' : 'status'}>{mensaje.texto}</p>}
    <KpiGrid label="Resumen de reportes" items={[
      { label: 'Total visible', value: cargando ? '—' : reportes.length, detail: 'Según tus permisos', icon: '01' },
      { label: 'Pendientes', value: cargando ? '—' : pendientes, detail: 'Esperan revisión', icon: '02' },
      { label: 'En revisión', value: cargando ? '—' : enRevision, detail: 'Con seguimiento activo', icon: '03' },
      { label: 'Este mes', value: cargando ? '—' : esteMes, detail: 'Nuevos registros', icon: '04' },
    ]} />
    {vista === 'registro'
      ? <ReportCreateForm form={form} setForm={setForm} archivos={archivos} setArchivos={setArchivos} estudiantes={estudiantes} guardando={guardando} onSubmit={registrar} onCancel={() => { setVista('consulta'); setMensaje(null); }} />
      : <div className="reports-consultation">
          <div className="reports-list-panel">
            <header className="reports-consultation-header"><div><span>Explorador de reportes</span><h3>Consulta y seguimiento</h3></div><small>Selecciona un registro para abrir su trazabilidad</small></header>
            <div className="reports-toolbar">
              <label className="reports-search"><span>Buscar reporte</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Estudiante, curso, docente o situación" /></label>
              <label><span>Tipo</span><select value={tipo} onChange={(event) => setTipo(event.target.value)}><option>Todos</option>{Object.entries(TIPO_LABELS).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
              <label><span>Estado</span><select value={estado} onChange={(event) => setEstado(event.target.value)}><option>Todos</option>{estados.map((item) => <option value={item} key={item}>{ESTADO_LABELS[item]}</option>)}</select></label>
              <label><span>Curso</span><select value={curso} onChange={(event) => setCurso(event.target.value)}><option>Todos</option>{cursos.map((item) => <option key={item}>{item}</option>)}</select></label>
              <label><span>Periodo</span><select value={periodo} onChange={(event) => setPeriodo(event.target.value as Periodo)}><option value="Todos">Todos</option><option value="7">Últimos 7 días</option><option value="30">Últimos 30 días</option><option value="mes">Este mes</option></select></label>
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
          {seleccionadoId !== null && <div className="report-modal-backdrop" role="presentation" onMouseDown={() => setSeleccionadoId(null)}>
            <div className="report-modal" role="dialog" aria-modal="true" aria-label="Detalle del reporte" onMouseDown={(event) => event.stopPropagation()}>
              <button type="button" className="report-modal-close" aria-label="Cerrar detalle" onClick={() => setSeleccionadoId(null)}>×</button>
              <ReportDetail key={seleccionadoId} reporte={detalle?.id === seleccionadoId ? detalle : null} loading={cargandoDetalle} currentUserId={currentUserId} onUpdated={refrescarReporte} />
            </div>
          </div>}
        </div>}
  </section>;
}

function ReportCreateForm({ form, setForm, archivos, setArchivos, estudiantes, guardando, onSubmit, onCancel }: {
  form: ReporteFormData;
  setForm: (form: ReporteFormData) => void;
  archivos: File[];
  setArchivos: (files: File[]) => void;
  estudiantes: Estudiante[];
  guardando: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return <form className="report-create-form" onSubmit={onSubmit}>
    <header className="report-form-intro">
      <span className="report-form-symbol" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5m-5 3h5"/></svg></span>
      <div><span className="report-form-kicker">Nuevo reporte</span><h3>Observador · Acta de reunión</h3><p>Registra la información de forma clara, ordenada y segura.</p></div>
      <strong>Los campos con * son obligatorios</strong>
      <ol className="report-form-progress" aria-label="Secciones del formulario">
        <li><b>1</b><span>Estudiante</span></li><li><b>2</b><span>Orden del día</span></li><li><b>3</b><span>Desarrollo</span></li><li><b>4</b><span>Evidencias</span></li>
      </ol>
    </header>
    <div className="report-form-sections">
      <ObservadorFields value={form.observador} onChange={observador => setForm({ ...form, observador })} estudiante={<StudentSearch estudiantes={estudiantes} value={form.estudianteId} onChange={alumno => {
        setForm({ ...form, estudianteId: alumno ? String(alumno.id) : '' });
      }} />} />
      <fieldset className="report-form-section report-evidence-section"><legend><span>4</span> Evidencias y privacidad</legend>
        <section className="report-evidence-field" aria-labelledby="report-evidence-title"><span id="report-evidence-title">Archivos de soporte (opcional)</span><p>Adjunta documentos o imágenes que ayuden a sustentar el reporte.</p><EvidenceUpload files={archivos} onChange={setArchivos} disabled={guardando} /></section>
        <div className="report-form-options">
          <p className="report-notification-note"><strong>Notificaciones institucionales</strong><span>Al guardar, se notificará al acudiente y al director de grupo configurados.</span></p>
          <label className="report-reserved-option"><input type="checkbox" checked={form.confidencial} onChange={e => setForm({ ...form, confidencial: e.target.checked })} /><span><strong>Acceso reservado</strong><small>Solo el autor y coordinación podrán consultar este reporte.</small></span></label>
        </div>
      </fieldset>
    </div>
    <footer className="report-form-actions"><div><strong>Revisa la información antes de continuar</strong><span>El registro quedará asociado a tu usuario y a la fecha actual.</span></div><button type="button" onClick={onCancel}>Cancelar</button><button className="primary-button" type="submit" disabled={guardando || estudiantes.length === 0}>{guardando ? 'Registrando...' : 'Registrar reporte'}</button></footer>
  </form>;
}

function ReportDetail({ reporte, loading, currentUserId, onUpdated }: {
  reporte: ReporteDetalle | null;
  loading: boolean;
  currentUserId: number;
  onUpdated: (id: number, message: string) => Promise<void>;
}) {
  const [observadorEdicion, setObservadorEdicion] = useState<Observador | null>(null);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [editForm, setEditForm] = useState({ fechaHecho: '', lugar: '', situacion: '', descripcion: '', actuacionInicial: '', confidencial: false });
  const [estado, setEstado] = useState<EstadoReporte>('Pendiente');
  const [justificacion, setJustificacion] = useState('');
  const [observacion, setObservacion] = useState('');
  const [archivosEvidencia, setArchivosEvidencia] = useState<File[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!error) return;
    const timer = window.setTimeout(() => setError(''), 5_000);
    return () => window.clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!reporte) return;
    const timer = window.setTimeout(() => {
      setModoEdicion(false);
      setObservadorEdicion(reporte.observador);
      setEditForm({
        fechaHecho: fechaLocalInput(parseReportDate(reporte.fechaHecho || reporte.fecha)),
        lugar: reporte.lugar || '',
        situacion: reporte.situacion || '',
        descripcion: reporte.descripcion,
        actuacionInicial: reporte.actuacionInicial || '',
        confidencial: Boolean(reporte.confidencial),
      });
      setEstado(reporte.estado);
      setJustificacion('');
      setObservacion('');
      setArchivosEvidencia([]);
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
      body: JSON.stringify({ ...editForm, ...(observadorEdicion ? { observador: observadorEdicion } : {}), fechaHecho: new Date(editForm.fechaHecho).toISOString() }),
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
    if (!archivosEvidencia.length) return;
    const formElement = event.currentTarget;
    setGuardando(true);
    setError('');
    try {
      const fallidos: string[] = [];
      for (const archivo of archivosEvidencia) {
        const adjunto = new FormData();
        adjunto.set('archivo', archivo);
        const response = await fetch(`/api/reportes/${reporte!.id}/evidencias/archivo`, { method: 'POST', body: adjunto }).catch(() => null);
        if (!response?.ok) fallidos.push(archivo.name);
      }
      const guardados = archivosEvidencia.length - fallidos.length;
      if (guardados > 0) {
        setArchivosEvidencia([]);
        formElement.reset();
        await onUpdated(reporte!.id, `${guardados} archivo${guardados === 1 ? '' : 's'} adjuntado${guardados === 1 ? '' : 's'} al reporte.`);
      }
      if (fallidos.length) setError(`No se pudieron adjuntar: ${fallidos.join(', ')}.`);
    } catch {
      setError('Los archivos se procesaron, pero no fue posible actualizar el detalle. Recarga la página para verificar el resultado.');
    } finally {
      setGuardando(false);
    }
  }

  if (loading) return <aside className="report-detail-panel report-detail-loading" aria-live="polite"><span /><span /><span /><p>Cargando trazabilidad...</p></aside>;
  if (!reporte) return <aside className="report-detail-panel report-detail-panel--empty"><div className="report-detail-empty"><span aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3.5h7l4 4v13H7z"/><path d="M14 3.5v4h4M10 12h5m-5 3h5"/></svg></span><strong>Selecciona un reporte</strong><p>Aquí podrás consultar hechos, evidencias, observaciones y seguimiento.</p></div></aside>;

  const estadosDisponibles = [reporte.estado, ...TRANSICIONES[reporte.estado]];
  return <aside className="report-detail-panel">
    <div className="report-detail-heading"><div><span>Reporte #{reporte.id}</span><h3>{reporte.estudiante}</h3><p>{reporte.grado}-{reporte.grupo} · {reporte.docenteId === currentUserId ? 'Registrado por ti' : reporte.docente}</p></div><div className="report-detail-badges"><span className={`report-type report-type--${reporte.tipoFalta.toLowerCase()}`}>{TIPO_LABELS[reporte.tipoFalta]}</span>{Boolean(reporte.confidencial) && <span className="report-private-badge">Reservado</span>}</div></div>
    <dl className="report-metadata"><div><dt>Estado</dt><dd><span className={`report-status report-status--${estadoClase(reporte.estado)}`}>{ESTADO_LABELS[reporte.estado]}</span></dd></div><div><dt>Hecho ocurrido</dt><dd>{fechaLegible(reporte.fechaHecho || reporte.fecha)}</dd></div><div><dt>Lugar</dt><dd>{reporte.lugar || 'Sin registrar'}</dd></div><div><dt>Registrado</dt><dd>{fechaLegible(reporte.fecha)}</dd></div></dl>
    {error && <p className="report-detail-error" role="alert">{error}</p>}
    {modoEdicion ? <div className="report-detail-editor">
      {observadorEdicion ? <ObservadorFields value={observadorEdicion} onChange={setObservadorEdicion} /> : <>
      <label><span>Fecha y hora</span><input type="datetime-local" value={editForm.fechaHecho} max={fechaLocalInput()} onChange={(event) => setEditForm({ ...editForm, fechaHecho: event.target.value })} /></label>
      <label><span>Lugar</span><input value={editForm.lugar} onChange={(event) => setEditForm({ ...editForm, lugar: event.target.value })} /></label>
      <label><span>Situación</span><input value={editForm.situacion} onChange={(event) => setEditForm({ ...editForm, situacion: event.target.value })} /></label>
      <label><span>Descripción</span><textarea minLength={20} maxLength={2000} value={editForm.descripcion} onChange={(event) => setEditForm({ ...editForm, descripcion: event.target.value })} /></label>
      <label><span>Actuación inicial</span><textarea minLength={3} maxLength={1000} value={editForm.actuacionInicial} onChange={(event) => setEditForm({ ...editForm, actuacionInicial: event.target.value })} /></label>
      </>}
      <label className="report-editor-private"><input type="checkbox" checked={editForm.confidencial} onChange={(event) => setEditForm({ ...editForm, confidencial: event.target.checked })} /><span>Acceso reservado · solo autor y coordinación</span></label>
      <div><button type="button" onClick={() => setModoEdicion(false)}>Cancelar</button><button type="button" className="primary-button" disabled={guardando || editForm.descripcion.trim().length < 20} onClick={() => void guardarEdicion()}>{guardando ? 'Guardando...' : 'Guardar corrección'}</button></div>
    </div> : reporte.observador ? <ObservadorDetalle value={reporte.observador} /> : <>
      <div className="report-detail-copy"><span>Situación identificada</span><strong>{reporte.situacion || 'Sin clasificación específica'}</strong></div>
      <div className="report-detail-copy"><span>Descripción de los hechos</span><p>{reporte.descripcion}</p></div>
      <div className="report-detail-copy"><span>Actuación inicial</span><p>{reporte.actuacionInicial || 'No registrada'}</p></div>
    </>}
    {!modoEdicion && reporte.permisos.puedeEditar && <button type="button" className="report-edit-button" onClick={() => setModoEdicion(true)}>Corregir reporte <small>Disponible hasta {fechaLegible(reporte.editableHasta)}</small></button>}

    <section className="report-trace-section"><header><div><span>Evidencias</span><strong>{reporte.evidencias.length}</strong></div>{reporte.permisos.puedeAgregarEvidencia && <small>Archivos adjuntos</small>}</header>
      <div className="report-evidence-list">{reporte.evidencias.length ? reporte.evidencias.map((item) => urlSegura(item.url) && <a href={item.url} target="_blank" rel="noreferrer" key={item.id}><span>{item.tipo}</span><strong>{item.nombre}</strong><small>{fechaLegible(item.creadoEn)}</small></a>) : <p>Sin evidencias vinculadas.</p>}</div>
      {reporte.permisos.puedeAgregarEvidencia && <details className="report-inline-form"><summary>Adjuntar archivos</summary><form onSubmit={agregarEvidencia}><div className="wide"><EvidenceUpload files={archivosEvidencia} onChange={setArchivosEvidencia} disabled={guardando} /></div><button type="submit" disabled={guardando || !archivosEvidencia.length}>{guardando ? 'Guardando...' : 'Adjuntar archivos'}</button></form></details>}
    </section>

    <section className="report-trace-section"><header><div><span>Historial de observaciones</span><strong>{reporte.observacionesLista.length}</strong></div></header>
      <ol className="report-timeline">{reporte.observacionesLista.length ? reporte.observacionesLista.map((item) => <li key={item.id}><i /><div><strong>{item.usuario}<small>{item.rol}</small></strong><time dateTime={item.creadoEn}>{fechaLegible(item.creadoEn)}</time><p>{item.texto}</p></div></li>) : <li className="report-timeline-empty">Todavía no hay observaciones.</li>}</ol>
      {reporte.permisos.puedeObservar && <form className="report-observation-form" onSubmit={agregarObservacion}><label><span>Nueva observación</span><textarea value={observacion} minLength={4} maxLength={1500} onChange={(event) => setObservacion(event.target.value)} placeholder="Registra un compromiso, aclaración o avance verificable." required /></label><button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Agregar al historial'}</button></form>}
    </section>

    {reporte.notificaciones.length > 0 && <section className="report-trace-section"><header><div><span>Notificaciones</span><strong>{reporte.notificaciones.length}</strong></div></header><ul className="report-notification-list">{reporte.notificaciones.map((item) => <li key={`${item.destinatarioTipo}-${item.id}`}><span>{item.canal === 'email' ? 'Correo' : 'Aplicación'}</span><div><strong>{item.destinatario}</strong><small>{item.destinatarioTipo} · {fechaLegible(item.enviadoEn)}</small></div></li>)}</ul></section>}

    {reporte.permisos.puedeGestionarEstado && <section className="report-status-editor"><h4>Gestión de coordinación</h4><p>Los cierres y anulaciones requieren una justificación que quedará en el historial.</p><label><span>Nuevo estado</span><select value={estado} onChange={(event) => setEstado(event.target.value as EstadoReporte)}>{estadosDisponibles.map((item) => <option value={item} key={item}>{ESTADO_LABELS[item]}</option>)}</select></label><label><span>Justificación o decisión</span><textarea value={justificacion} maxLength={1500} onChange={(event) => setJustificacion(event.target.value)} placeholder="Describe la decisión, los compromisos o el motivo de cierre." /></label><button type="button" className="module-primary-action" disabled={guardando || (estado === reporte.estado && !justificacion.trim())} onClick={() => void guardarEstado()}>{guardando ? 'Guardando...' : 'Actualizar gestión'}</button></section>}
  </aside>;
}
