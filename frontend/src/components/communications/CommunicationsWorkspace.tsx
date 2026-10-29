'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import ModuleHeader from '@/components/ui/ModuleHeader';
import KpiGrid from '@/components/ui/KpiGrid';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';
import { parseReportDate } from '@/lib/report-dates';
import { coincideBusqueda } from '@/lib/search-normalization';
import { GRUPOS_ACADEMICOS } from '@/lib/academic-groups';

type Tipo = 'Circular' | 'Comunicado' | 'Aviso' | 'Citación';
type Estado = 'Borrador' | 'Publicado';
type Comunicacion = { id: number; titulo: string; tipo: Tipo; destinatarios: string; contenido: string; estado: Estado; autorId: number; creadoEn: string; publicadoEn: string | null; visualizaciones: number; archivosCantidad: number; autor: string };
type Archivo = { id: number; nombre: string; mimeType: string; tamano: number };
type Detalle = Comunicacion & { archivos: Archivo[] };
type ArchivoLocal = File & { idLocal: string };
type Feedback = { tipo: 'success' | 'error'; texto: string };

const TIPOS: Array<'Todos' | Tipo> = ['Todos', 'Circular', 'Comunicado', 'Aviso', 'Citación'];
const DESTINATARIOS = ['Toda la comunidad', 'Solo docentes', 'Solo estudiantes', ...GRUPOS_ACADEMICOS.map((grupo) => grupo.etiqueta)];
const MIME_PERMITIDOS = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']);
const MAX_ARCHIVO = 4 * 1024 * 1024;

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function fechaLegible(value: string | null) {
  if (!value) return 'Sin fecha';
  const date = parseReportDate(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(date);
}

function tamanoLegible(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function lecturasLegibles(cantidad: number) {
  return `${cantidad} ${cantidad === 1 ? 'lectura' : 'lecturas'}`;
}

function destinatariosLegibles(value: string) {
  if (value === 'Solo docentes') return 'Docentes';
  if (value === 'Solo estudiantes') return 'Estudiantes';
  return value;
}

function errorArchivo(file: File) {
  if (!MIME_PERMITIDOS.has(file.type)) return `${file.name}: tipo de archivo no permitido.`;
  if (file.size <= 0 || file.size > MAX_ARCHIVO) return `${file.name}: el tamaño máximo es 4 MB.`;
  return null;
}

export default function CommunicationsWorkspace({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Comunicacion[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<'Todos' | Tipo>('Todos');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  useAutoDismiss(Boolean(feedback), () => setFeedback(null));
  const [componer, setComponer] = useState(false);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const [detalle, setDetalle] = useState<Detalle | null>(null);
  const [detalleCargando, setDetalleCargando] = useState(false);
  const [detalleError, setDetalleError] = useState<string | null>(null);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<Tipo>('Comunicado');
  const [destinatarios, setDestinatarios] = useState(DESTINATARIOS[0]);
  const [contenido, setContenido] = useState('');
  const [archivos, setArchivos] = useState<ArchivoLocal[]>([]);
  const [arrastrando, setArrastrando] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const inputArchivos = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    const response = await fetch('/api/comunicaciones', { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudieron cargar las comunicaciones.'));
    setItems(await response.json() as Comunicacion[]);
  }, []);

  useEffect(() => {
    let activo = true;
    const timer = window.setTimeout(() => {
      void cargar().catch((cause) => { if (activo) setError(cause instanceof Error ? cause.message : 'No se pudo abrir Comunicaciones.'); })
        .finally(() => { if (activo) setCargando(false); });
    }, 0);
    return () => { activo = false; window.clearTimeout(timer); };
  }, [cargar]);

  useEffect(() => {
    if (detalleId === null) return;
    let activo = true;
    const timer = window.setTimeout(() => {
      setDetalle(null); setDetalleError(null); setDetalleCargando(true);
      void fetch(`/api/comunicaciones/${detalleId}`, { cache: 'no-store' })
        .then(async (response) => {
          if (!response.ok) throw new Error(await leerError(response, 'No se pudo cargar la comunicación.'));
          return response.json() as Promise<Detalle>;
        })
        .then((data) => { if (activo) setDetalle(data); })
        .catch((cause) => { if (activo) setDetalleError(cause instanceof Error ? cause.message : 'No se pudo cargar la comunicación.'); })
        .finally(() => { if (activo) setDetalleCargando(false); });
    }, 0);
    return () => { activo = false; window.clearTimeout(timer); };
  }, [detalleId]);

  const dialogoCrear = useDialogFocus<HTMLElement>(componer, () => { if (!guardando) setComponer(false); }, !guardando);
  const dialogoDetalle = useDialogFocus<HTMLElement>(detalleId !== null, () => setDetalleId(null), !guardando);
  const visibles = useMemo(() => items.filter((item) => (filtroTipo === 'Todos' || item.tipo === filtroTipo)
    && coincideBusqueda(busqueda, [item.titulo, item.contenido, item.tipo, item.destinatarios, item.autor, item.estado])), [busqueda, filtroTipo, items]);
  const publicadas = items.filter((item) => item.estado === 'Publicado').length;
  const borradores = items.filter((item) => item.estado === 'Borrador').length;

  function resetFormulario() {
    setTitulo(''); setTipo('Comunicado'); setDestinatarios(DESTINATARIOS[0]); setContenido('');
    setArchivos([]); setFormError(null); setFeedback(null);
    if (inputArchivos.current) inputArchivos.current.value = '';
  }

  function agregarArchivos(nuevos: File[]) {
    setFormError(null);
    const rechazado = nuevos.map(errorArchivo).find(Boolean);
    if (rechazado) { setFormError(rechazado); return; }
    if (archivos.length + nuevos.length > 5) { setFormError('Puedes adjuntar hasta 5 archivos por comunicación.'); return; }
    setArchivos((actuales) => [...actuales, ...nuevos.map((file) => Object.assign(file, { idLocal: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}` }))]);
    if (inputArchivos.current) inputArchivos.current.value = '';
  }

  function manejarDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault(); setArrastrando(false); agregarArchivos(Array.from(event.dataTransfer.files));
  }

  async function guardar(event: { preventDefault(): void }, estado: Estado) {
    event.preventDefault();
    if (!titulo.trim()) { setFormError('Escribe un título para la comunicación.'); return; }
    if (estado === 'Publicado' && !contenido.trim()) { setFormError('Agrega el contenido antes de publicar.'); return; }
    setGuardando(true); setFormError(null); setFeedback(null);
    try {
      const form = new FormData();
      form.set('titulo', titulo); form.set('tipo', tipo); form.set('destinatarios', destinatarios); form.set('contenido', contenido); form.set('estado', estado);
      archivos.forEach((archivo) => form.append('archivos', archivo, archivo.name));
      const response = await fetch('/api/comunicaciones', { method: 'POST', body: form });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo guardar la comunicación.'));
      await cargar(); resetFormulario(); setComponer(false);
      setFeedback({ tipo: 'success', texto: estado === 'Publicado' ? 'La comunicación se publicó correctamente.' : 'El borrador se guardó correctamente.' });
    } catch (cause) {
      setFormError(cause instanceof Error ? cause.message : 'No se pudo guardar la comunicación.');
    } finally { setGuardando(false); }
  }

  async function publicarBorrador() {
    if (!detalle || !canManage) return;
    setGuardando(true); setDetalleError(null);
    try {
      const response = await fetch(`/api/comunicaciones/${detalle.id}`, { method: 'PATCH' });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo publicar el borrador.'));
      await cargar();
      const refresh = await fetch(`/api/comunicaciones/${detalle.id}`, { cache: 'no-store' });
      if (!refresh.ok) throw new Error(await leerError(refresh, 'Se publicó, pero no se pudo actualizar la vista.'));
      setDetalle(await refresh.json() as Detalle);
      setFeedback({ tipo: 'success', texto: 'El borrador se publicó correctamente.' });
    } catch (cause) { setDetalleError(cause instanceof Error ? cause.message : 'No se pudo publicar el borrador.'); }
    finally { setGuardando(false); }
  }

  return <section className="institutional-comms-workspace ui-workspace" aria-label="Comunicaciones institucionales">
    <ModuleHeader
      kicker="Información institucional"
      title="Comunicaciones"
      description="Comparte circulares, avisos y mensajes con estudiantes y equipos de la institución."
      icon={<svg viewBox="0 0 24 24"><path d="M4 5.5h16v12H8l-4 3z"/><path d="M8 9h8m-8 4h6"/></svg>}
      action={canManage ? <button type="button" className="ui-button ui-button--primary" onClick={() => { resetFormulario(); setComponer(true); }}>＋ Nueva comunicación</button> : undefined}
    />
    <KpiGrid label="Resumen de comunicaciones" items={[
      { label: 'Publicadas', value: cargando ? '—' : publicadas, detail: 'Disponibles para consulta', icon: '01' },
      { label: 'Borradores', value: cargando ? '—' : borradores, detail: 'Pendientes de publicación', icon: '02' },
    ]} />
    {feedback && <p className={`feedback ${feedback.tipo}`} role={feedback.tipo === 'error' ? 'alert' : 'status'}>{feedback.texto}</p>}
    <section className="institutional-comms-catalog" aria-label="Listado de comunicaciones">
      <div className="institutional-comms-catalog__heading"><div><span className="ui-module-header__kicker">Comunicaciones institucionales</span><h3>Mensajes y circulares</h3><p>Consulta la información por tipo o busca por título, contenido y destinatario.</p></div><span role="status" aria-live="polite" aria-atomic="true">{cargando ? 'Cargando…' : `${visibles.length} ${visibles.length === 1 ? 'comunicación' : 'comunicaciones'}`}</span></div>
      <div className="institutional-comms-controls">
        <label className="institutional-comms-search"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar comunicaciones</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar comunicación…" /></label>
        <div className="institutional-comms-filters" role="group" aria-label="Filtrar por tipo">{TIPOS.map((item) => <button type="button" key={item} className={filtroTipo === item ? 'active' : ''} aria-pressed={filtroTipo === item} onClick={() => setFiltroTipo(item)}>{item}</button>)}</div>
      </div>
      {error ? <div className="institutional-comms-empty" role="alert"><strong>No pudimos cargar las comunicaciones</strong><p>{error}</p><button type="button" className="ui-button ui-button--secondary" onClick={() => { setCargando(true); setError(null); void cargar().catch((cause) => setError(cause instanceof Error ? cause.message : 'Error de conexión.')).finally(() => setCargando(false)); }}>Reintentar</button></div>
        : cargando ? <div className="institutional-comms-empty" role="status">Cargando comunicaciones…</div>
          : visibles.length ? <div className="institutional-comms-list">{visibles.map((item) => <button type="button" className="institutional-comms-card" key={item.id} onClick={() => setDetalleId(item.id)}>
            <span className="institutional-comms-card__main"><span className="institutional-comms-tags"><span className="institutional-comms-tag institutional-comms-tag--type">{item.tipo}</span><span className={`institutional-comms-tag institutional-comms-tag--${item.estado.toLowerCase()}`}>{item.estado}</span><span>{destinatariosLegibles(item.destinatarios)}</span></span><strong>{item.titulo}</strong><span className="institutional-comms-card__summary">{item.contenido || 'Esta comunicación no tiene texto adicional.'}</span><span className="institutional-comms-card__meta"><span>{item.autor}</span><span>{fechaLegible(item.publicadoEn || item.creadoEn)}</span>{item.estado === 'Publicado' && <span className="institutional-comms-card__views" aria-label={lecturasLegibles(item.visualizaciones)}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 10s2.8-5 8-5 8 5 8 5-2.8 5-8 5-8-5-8-5Z"/><circle cx="10" cy="10" r="2.3"/></svg>{lecturasLegibles(item.visualizaciones)}</span>}{item.archivosCantidad > 0 && <span>{item.archivosCantidad} adjunto{item.archivosCantidad === 1 ? '' : 's'}</span>}</span></span>
            <span className="institutional-comms-card__side" aria-hidden="true">›</span>
          </button>)}</div>
            : <div className="institutional-comms-empty"><span aria-hidden="true">✉</span><strong>{busqueda || filtroTipo !== 'Todos' ? 'No encontramos comunicaciones' : 'Aún no hay comunicaciones'}</strong><p>{busqueda || filtroTipo !== 'Todos' ? 'Prueba con otra búsqueda o cambia el filtro seleccionado.' : canManage ? 'Crea una comunicación para compartir información con la comunidad.' : 'Cuando se publique información institucional, aparecerá aquí.'}</p></div>}
    </section>

    {componer && <div className="institutional-comms-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !guardando) setComponer(false); }}>
      <section className="institutional-comms-modal institutional-comms-modal--compose" ref={dialogoCrear} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="communications-compose-title">
        <form onSubmit={(event) => void guardar(event, 'Publicado')}>
          <header><div><span className="ui-module-header__kicker">Nueva publicación</span><h2 id="communications-compose-title">Crear comunicación</h2><p>Redacta el mensaje y elige quién debe recibirlo.</p></div><button type="button" aria-label="Cerrar formulario" disabled={guardando} onClick={() => setComponer(false)}>×</button></header>
          <div className="institutional-comms-form-body">
            <label>Título <span aria-hidden="true">*</span><input autoFocus maxLength={160} required value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Ej. Reunión de familias de grado sexto" /></label>
            <div className="institutional-comms-form-row"><label>Tipo de comunicación<select value={tipo} onChange={(event) => setTipo(event.target.value as Tipo)}>{TIPOS.filter((item): item is Tipo => item !== 'Todos').map((item) => <option key={item}>{item}</option>)}</select></label><label>Destinatarios<select value={destinatarios} onChange={(event) => setDestinatarios(event.target.value)}>{DESTINATARIOS.map((item) => <option key={item} value={item}>{destinatariosLegibles(item)}</option>)}</select></label></div>
            <label>Contenido <textarea maxLength={10000} value={contenido} onChange={(event) => setContenido(event.target.value)} placeholder="Escribe aquí el mensaje para la comunidad…" /><small>{contenido.length.toLocaleString('es-CO')} / 10.000 caracteres</small></label>
            <div><span className="institutional-comms-field-label">Archivos adjuntos <small>(opcional)</small></span><label className={`institutional-comms-dropzone ${arrastrando ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setArrastrando(true); }} onDragLeave={() => setArrastrando(false)} onDrop={manejarDrop}><input ref={inputArchivos} type="file" multiple accept=".pdf,.docx,.jpg,.jpeg,.png,.webp,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png,image/webp" aria-label="Seleccionar archivos adjuntos" onChange={(event) => agregarArchivos(Array.from(event.target.files || []))} /><span className="institutional-comms-dropzone__icon" aria-hidden="true">↥</span><strong>Arrastra tus archivos aquí</strong><span>o <u>selecciona desde tu dispositivo</u></span><small>PDF, DOCX, JPG, PNG o WebP · máximo 5 archivos · 4 MB cada uno</small></label>
              {archivos.length > 0 && <ul className="institutional-comms-local-files" aria-label="Archivos seleccionados">{archivos.map((archivo) => <li key={archivo.idLocal}><span className="institutional-comms-local-files__icon" aria-hidden="true">{archivo.name.split('.').pop()?.toUpperCase().slice(0, 4)}</span><span><strong>{archivo.name}</strong><small>{tamanoLegible(archivo.size)}</small></span><button type="button" aria-label={`Quitar ${archivo.name}`} onClick={() => setArchivos((itemsActuales) => itemsActuales.filter((item) => item.idLocal !== archivo.idLocal))}>Quitar</button></li>)}</ul>}
            </div>
            {formError && <p className="institutional-comms-form-error" role="alert">{formError}</p>}
          </div>
          <footer><button type="button" className="ui-button ui-button--secondary" disabled={guardando} onClick={() => setComponer(false)}>Cancelar</button><div><button type="button" className="ui-button ui-button--secondary" disabled={guardando || !titulo.trim()} onClick={(event) => void guardar(event, 'Borrador')}>{guardando ? 'Guardando…' : 'Guardar borrador'}</button><button type="submit" className="ui-button ui-button--primary" disabled={guardando}>{guardando ? 'Publicando…' : 'Publicar comunicación'}</button></div></footer>
        </form>
      </section>
    </div>}

    {detalleId !== null && <div className="institutional-comms-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !guardando) setDetalleId(null); }}>
      <article className="institutional-comms-modal institutional-comms-modal--detail" ref={dialogoDetalle} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="communications-detail-title">
        <header><div><span className="ui-module-header__kicker">Detalle de comunicación</span>{detalle && <div className="institutional-comms-tags"><span className="institutional-comms-tag institutional-comms-tag--type">{detalle.tipo}</span><span className={`institutional-comms-tag institutional-comms-tag--${detalle.estado.toLowerCase()}`}>{detalle.estado}</span></div>}</div><button type="button" aria-label="Cerrar detalle" disabled={guardando} onClick={() => setDetalleId(null)}>×</button></header>
        {detalleCargando ? <div className="institutional-comms-detail-loading" role="status">Cargando comunicación…</div> : detalleError ? <div className="institutional-comms-detail-loading" role="alert">{detalleError}</div> : detalle && <>
          <div className="institutional-comms-detail-content"><h2 id="communications-detail-title">{detalle.titulo}</h2><div className="institutional-comms-meta"><span>Para <strong>{destinatariosLegibles(detalle.destinatarios)}</strong></span><span>Por <strong>{detalle.autor}</strong></span><span>{fechaLegible(detalle.publicadoEn || detalle.creadoEn)}</span><span>{lecturasLegibles(detalle.visualizaciones)}</span></div><div className="institutional-comms-body">{detalle.contenido || 'Esta comunicación no tiene texto adicional.'}</div>
            {detalle.archivos.length > 0 && <section className="institutional-comms-files"><h3>Archivos adjuntos <span>{detalle.archivos.length}</span></h3>{detalle.archivos.map((archivo) => <a key={archivo.id} href={`/api/comunicaciones/${detalle.id}/archivos/${archivo.id}`} download={archivo.nombre}><span aria-hidden="true">↧</span><span><strong>{archivo.nombre}</strong><small>{tamanoLegible(archivo.tamano)}</small></span><span>Descargar</span></a>)}</section>}
          </div>
          <footer><span>{detalle.estado === 'Publicado' ? 'Publicada para la comunidad institucional' : 'Borrador · Solo visible para responsables autorizados'}</span>{canManage && detalle.estado === 'Borrador' && <button type="button" className="ui-button ui-button--primary" disabled={guardando} onClick={() => void publicarBorrador()}>{guardando ? 'Publicando…' : 'Publicar borrador'}</button>}</footer>
        </>}
      </article>
    </div>}
  </section>;
}
