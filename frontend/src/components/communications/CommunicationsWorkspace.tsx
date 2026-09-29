'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GRUPOS_ACADEMICOS } from '@/lib/academic-groups';

type Tipo = 'Circular' | 'Comunicado' | 'Aviso' | 'Citación';
type Comunicacion = {
  id: number; titulo: string; tipo: Tipo; destinatarios: string; contenido: string;
  estado: 'Borrador' | 'Publicado'; autor: string; autorId: number;
  creadoEn: string; publicadoEn: string | null; visualizaciones: number; archivosCantidad: number;
};
type Archivo = { id: number; nombre: string; mimeType: string; tamano: number };
type Detalle = Comunicacion & { archivos: Archivo[] };
const TIPOS: Tipo[] = ['Circular', 'Comunicado', 'Aviso', 'Citación'];
const DESTINATARIOS = ['Toda la comunidad', 'Solo docentes', 'Solo estudiantes', ...GRUPOS_ACADEMICOS.map((grupo) => grupo.etiqueta)];
const FECHA = new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });

export default function CommunicationsWorkspace({ canManage }: { canManage: boolean }) {
  const [items, setItems] = useState<Comunicacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [query, setQuery] = useState('');
  const [filtro, setFiltro] = useState<'Todos' | Tipo>('Todos');
  const [selected, setSelected] = useState<Detalle | null>(null);
  const selectionToken = useRef(0);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<Tipo>('Circular');
  const [destinatarios, setDestinatarios] = useState('Toda la comunidad');
  const [contenido, setContenido] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/comunicaciones', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible cargar las comunicaciones.');
      setItems(data);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No fue posible cargar las comunicaciones.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  const visibles = useMemo(() => items.filter((item) => {
    const coincideTipo = filtro === 'Todos' || item.tipo === filtro;
    const term = query.trim().toLocaleLowerCase('es');
    return coincideTipo && (!term || [item.titulo, item.contenido, item.destinatarios, item.autor].some((value) => value.toLocaleLowerCase('es').includes(term)));
  }), [items, filtro, query]);
  const publicados = items.filter((item) => item.estado === 'Publicado').length;

  async function verDetalle(id: number) {
    const item = items.find((comunicacion) => comunicacion.id === id);
    if (!item) return;
    const token = ++selectionToken.current;
    setSelected({ ...item, archivos: [] });
    setError('');
    try {
      const response = await fetch(`/api/comunicaciones/${id}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible abrir la comunicación.');
      if (selectionToken.current === token) setSelected(data);
      setItems((current) => current.map((item) => item.id === id ? { ...item, visualizaciones: data.visualizaciones } : item));
    } catch (cause) { if (selectionToken.current === token) setError(cause instanceof Error ? cause.message : 'No fue posible cargar los adjuntos.'); }
  }

  function resetForm() {
    setTitulo(''); setTipo('Circular'); setDestinatarios('Toda la comunidad'); setContenido(''); setArchivos([]);
  }
  function agregarArchivos(input: FileList | File[]) {
    const nuevos = Array.from(input);
    setArchivos((actual) => [...actual, ...nuevos].slice(0, 5));
  }
  async function guardar(estado: 'Borrador' | 'Publicado') {
    setSaving(true); setError('');
    try {
      const form = new FormData();
      form.set('titulo', titulo); form.set('tipo', tipo); form.set('destinatarios', destinatarios);
      form.set('contenido', contenido); form.set('estado', estado);
      archivos.forEach((file) => form.append('archivos', file));
      const response = await fetch('/api/comunicaciones', { method: 'POST', body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible guardar la comunicación.');
      setModal(false); resetForm();
      setFeedback(estado === 'Publicado' ? 'Comunicación publicada.' : 'Borrador guardado.');
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible guardar la comunicación.'); }
    finally { setSaving(false); }
  }
  async function publicarBorrador(id: number) {
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/comunicaciones/${id}`, { method: 'PATCH' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No fue posible publicar el borrador.');
      setSelected(null); setFeedback('Comunicación publicada.'); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'No fue posible publicar el borrador.'); }
    finally { setSaving(false); }
  }

  return <section className="institutional-comms">
      {feedback && <p className="feedback success" role="status">{feedback}</p>}
      {error && <p className="feedback error" role="alert">{error}</p>}
      {selected ? <>
        <button className="institutional-comms-back" type="button" onClick={() => { selectionToken.current += 1; setSelected(null); }}>‹ &nbsp;Volver a comunicaciones</button>
        <article className="institutional-comms-detail">
          <header>
            <div className="institutional-comms-tags"><span className={`institutional-comms-tag tag-${selected.tipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{selected.tipo}</span><span className={`institutional-comms-tag ${selected.estado === 'Publicado' ? 'tag-active' : 'tag-draft'}`}>{selected.estado === 'Publicado' ? 'Activo' : 'Borrador'}</span></div>
            <h2>{selected.titulo}</h2>
            <div className="institutional-comms-meta"><span>♧ {selected.destinatarios}</span><span>▣ {FECHA.format(new Date(selected.publicadoEn || selected.creadoEn))}</span><span>◉ {selected.visualizaciones} visualizaciones</span><span>Por: <strong>{selected.autor}</strong></span></div>
          </header>
          <div className="institutional-comms-body">{selected.contenido || 'Sin contenido todavía.'}</div>
          {selected.archivos.length > 0 && <div className="institutional-comms-files"><h3>Adjuntos</h3>{selected.archivos.map((file) => <a key={file.id} href={`/api/comunicaciones/${selected.id}/archivos/${file.id}`}>📎 {file.nombre}</a>)}</div>}
          {canManage && selected.estado === 'Borrador' && <footer><button type="button" className="institutional-comms-primary" disabled={saving || !selected.contenido.trim()} onClick={() => void publicarBorrador(selected.id)}>Publicar borrador</button></footer>}
        </article>
      </> : <>
        <div className="institutional-comms-header"><div><h2>Comunicaciones</h2><p>{publicados} comunicaciones publicadas{items.length > publicados ? ` · ${items.length - publicados} borradores` : ''}</p></div>{canManage && <button type="button" className="institutional-comms-primary" onClick={() => { setError(''); setModal(true); }}>＋ Nueva comunicación</button>}</div>
        <div className="institutional-comms-controls"><label className="institutional-comms-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar comunicación…" aria-label="Buscar comunicación" /></label><div className="institutional-comms-filters" aria-label="Filtrar por tipo">{(['Todos', ...TIPOS] as const).map((value) => <button key={value} type="button" className={filtro === value ? 'active' : ''} onClick={() => setFiltro(value)}>{value}</button>)}</div></div>
        {loading ? <p className="institutional-comms-empty">Cargando comunicaciones…</p> : visibles.length === 0 ? <p className="institutional-comms-empty">{items.length ? 'No hay comunicaciones que coincidan con la búsqueda.' : 'Aún no hay comunicaciones publicadas.'}</p> : <div className="institutional-comms-list">{visibles.map((item) => <button key={item.id} type="button" className="institutional-comms-card" onClick={() => void verDetalle(item.id)}><div className="institutional-comms-card-main"><div className="institutional-comms-tags"><span className={`institutional-comms-tag tag-${item.tipo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`}>{item.tipo}</span><span>{item.destinatarios}</span>{item.estado === 'Borrador' && <span className="institutional-comms-tag tag-draft">Borrador</span>}</div><h3>{item.titulo}</h3><p>{item.contenido || 'Sin contenido todavía.'}</p></div><div className="institutional-comms-card-side"><span>{FECHA.format(new Date(item.publicadoEn || item.creadoEn))}</span><span>◉ {item.visualizaciones}</span><span>{item.autor}</span></div></button>)}</div>}
      </>}
      {modal && <div className="institutional-comms-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModal(false); }}><div className="institutional-comms-modal" role="dialog" aria-modal="true" aria-labelledby="comms-modal-title"><form onSubmit={(event) => { event.preventDefault(); void guardar('Publicado'); }}><header><h2 id="comms-modal-title">Nueva comunicación</h2><button type="button" aria-label="Cerrar" onClick={() => setModal(false)}>×</button></header><div className="institutional-comms-form-body">{error && <p className="feedback error" role="alert">{error}</p>}<label>Título<input required maxLength={160} value={titulo} onChange={(event) => setTitulo(event.target.value)} placeholder="Título de la comunicación" /></label><div className="institutional-comms-form-row"><label>Tipo<select value={tipo} onChange={(event) => setTipo(event.target.value as Tipo)}>{TIPOS.map((value) => <option key={value}>{value}</option>)}</select></label><label>Destinatarios<select value={destinatarios} onChange={(event) => setDestinatarios(event.target.value)}>{DESTINATARIOS.map((value) => <option key={value}>{value}</option>)}</select></label></div><label>Contenido<textarea value={contenido} onChange={(event) => setContenido(event.target.value)} rows={5} maxLength={10000} placeholder="Escribe el contenido de la comunicación…" /></label><div><span className="institutional-comms-field-label">Adjuntos (opcional)</span><label className={`institutional-comms-dropzone ${dragging ? 'dragging' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); agregarArchivos(event.dataTransfer.files); }}>📎 &nbsp;Arrastrar archivos o hacer clic para adjuntar<input type="file" multiple accept=".pdf,.docx,image/jpeg,image/png,image/webp" onChange={(event) => { if (event.target.files) agregarArchivos(event.target.files); event.target.value = ''; }} /></label><small>Hasta 5 archivos PDF, DOCX o imágenes de 4 MB cada uno.</small>{archivos.map((file, index) => <div className="institutional-comms-file" key={`${file.name}-${index}`}>{file.name} <button type="button" aria-label={`Quitar ${file.name}`} onClick={() => setArchivos((current) => current.filter((_, position) => position !== index))}>×</button></div>)}</div></div><footer><button type="button" disabled={saving || !titulo.trim()} onClick={() => void guardar('Borrador')}>Guardar borrador</button><div><button type="button" disabled={saving} onClick={() => setModal(false)}>Cancelar</button><button type="submit" className="institutional-comms-primary" disabled={saving || !titulo.trim() || !contenido.trim()}>{saving ? 'Guardando…' : 'Publicar'}</button></div></footer></form></div></div>}
  </section>;
}
