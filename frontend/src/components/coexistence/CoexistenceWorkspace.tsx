'use client';

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Estudiante } from '@/types/students';
import { parseReportDate } from '@/lib/report-dates';
import { coincideBusqueda } from '@/lib/search-normalization';
import ModuleHeader from '@/components/ui/ModuleHeader';
import KpiGrid from '@/components/ui/KpiGrid';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import StudentSearch from '@/components/reports/StudentSearch';
import { EvidenceUpload } from '@/components/reports/ReportsWorkspace';

type TipoSituacion = 'Tipo I' | 'Tipo II' | 'Tipo III';
type Regla = { tipo: TipoSituacion; articulo: string; descripcion: string; competencia: string; accion: string; instancia: string; requiereSiuce: boolean; pasosRaice: number[] };
type Paso = { paso: number; nombre: string; responsable: string; aplicaA: TipoSituacion[] };
type Manual = { fuente: string; tipos: Regla[]; pasosRaice: Paso[]; situacionesTipificadas: Record<TipoSituacion, string[]> };
type Caso = { id: string; estudianteId: string; estudiante: string; grado: string; tipo: TipoSituacion; descripcion: string; etapa: string; competencia: string; notificacionAcudiente: string; requiereSiuce: boolean | number; creadoPorNombre: string; creadoPorRol: string; evidencia: string | null; evidenciaNombre?: string; estado: string; creadoEn: string };
type Feedback = { tipo: 'success' | 'error'; texto: string };

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function fechaLegible(value: string) {
  const date = parseReportDate(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(date);
}

export default function CoexistenceWorkspace() {
  const formularioRef = useRef<HTMLFormElement>(null);
  const envioEnCursoRef = useRef(false);
  const [manual, setManual] = useState<Manual | null>(null);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [tipo, setTipo] = useState<TipoSituacion>('Tipo I');
  const [descripcion, setDescripcion] = useState('');
  const [paso, setPaso] = useState('');
  const [notificacion, setNotificacion] = useState('');
  const [archivosEvidencia, setArchivosEvidencia] = useState<File[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [etapaFormulario, setEtapaFormulario] = useState(1);
  const [formularioRestaurado, setFormularioRestaurado] = useState(false);
  const [casoSeleccionado, setCasoSeleccionado] = useState<Caso | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  useDialogFocus<HTMLElement>(Boolean(casoSeleccionado), () => setCasoSeleccionado(null));

  const cargar = useCallback(async () => {
    const [manualResponse, estudiantesResponse, casosResponse] = await Promise.all([
      fetch('/api/manual-convivencia', { cache: 'no-store' }),
      fetch('/api/estudiantes', { cache: 'no-store' }),
      fetch('/api/convivencia', { cache: 'no-store' }),
    ]);
    if (!manualResponse.ok) throw new Error(await leerError(manualResponse, 'No se pudo consultar el manual de convivencia.'));
    if (!estudiantesResponse.ok) throw new Error(await leerError(estudiantesResponse, 'No se pudieron cargar los estudiantes.'));
    if (!casosResponse.ok) throw new Error(await leerError(casosResponse, 'No se pudieron cargar los procesos de convivencia.'));
    setManual(await manualResponse.json() as Manual);
    const dataEstudiantes = await estudiantesResponse.json() as Estudiante[];
    setEstudiantes(dataEstudiantes.filter((item) => item.activo && !item.archivado));
    setCasos(await casosResponse.json() as Caso[]);
  }, []);

  useEffect(() => {
    let activa = true;
    const timer = window.setTimeout(() => {
      void cargar().catch((error) => {
        if (activa) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir convivencia.' });
      }).finally(() => { if (activa) setCargando(false); });
    }, 0);
    return () => { activa = false; window.clearTimeout(timer); };
  }, [cargar]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const guardada = Number(window.sessionStorage.getItem('sigde:convivencia:etapa'));
      setMostrarFormulario(window.sessionStorage.getItem('sigde:convivencia:formulario-abierto') === 'true');
      if (Number.isInteger(guardada) && guardada >= 1 && guardada <= 6) setEtapaFormulario(guardada);
      setFormularioRestaurado(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!mostrarFormulario) return;
    const frame = window.requestAnimationFrame(() => formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    return () => window.cancelAnimationFrame(frame);
  }, [mostrarFormulario]);

  useEffect(() => {
    if (!formularioRestaurado) return;
    window.sessionStorage.setItem('sigde:convivencia:formulario-abierto', String(mostrarFormulario));
    window.sessionStorage.setItem('sigde:convivencia:etapa', String(etapaFormulario));
  }, [mostrarFormulario, etapaFormulario, formularioRestaurado]);

  const estudiante = estudiantes.find((item) => item.id === Number(estudianteId)) ?? null;
  const regla = manual?.tipos.find((item) => item.tipo === tipo) ?? null;
  const pasos = manual?.pasosRaice.filter((item) => item.aplicaA.includes(tipo)) ?? [];
  const pasoSeleccionado = pasos.find((item) => item.paso === Number(paso)) ?? pasos[0] ?? null;
  const filtrados = useMemo(() => {
    return casos.filter((caso) => coincideBusqueda(busqueda, [caso.estudiante, caso.grado, caso.tipo, caso.descripcion, caso.etapa, caso.creadoPorNombre]));
  }, [busqueda, casos]);

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (etapaFormulario !== 6 || envioEnCursoRef.current) return;
    if (!estudiante || !regla || !pasoSeleccionado) return;
    envioEnCursoRef.current = true;
    setGuardando(true); setFeedback(null);
    try {
      const response = await fetch('/api/convivencia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          estudianteId: String(estudiante.id), estudiante: estudiante.nombre, grado: `${estudiante.grado}-${estudiante.grupo}`,
          tipo, descripcion, etapa: `Paso ${pasoSeleccionado.paso}: ${pasoSeleccionado.nombre}`,
          competencia: regla.competencia, notificacionAcudiente: notificacion,
          requiereSiuce: regla.requiereSiuce,
        }),
      });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo registrar el proceso.'));
      const creado = await response.json() as Caso;
      if (archivosEvidencia[0]) {
        const adjunto = new FormData();
        adjunto.append('archivo', archivosEvidencia[0]);
        const subida = await fetch(`/api/convivencia/${creado.id}/evidencia`, { method: 'POST', body: adjunto }).catch(() => null);
        if (!subida?.ok) throw new Error(subida ? await leerError(subida, 'El proceso se registró, pero no fue posible adjuntar el documento.') : 'El proceso se registró, pero no fue posible adjuntar el documento.');
      }
      setEstudianteId(''); setTipo('Tipo I'); setDescripcion(''); setPaso(''); setNotificacion(''); setArchivosEvidencia([]); setMostrarFormulario(false);
      setEtapaFormulario(1);
      setFeedback({ tipo: 'success', texto: 'Proceso de convivencia registrado con la ruta institucional correspondiente.' });
      await cargar();
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo registrar el proceso.' });
    } finally { envioEnCursoRef.current = false; setGuardando(false); }
  }

  const abiertos = casos.filter((caso) => caso.estado === 'abierto').length;
  const siuce = casos.filter((caso) => Boolean(caso.requiereSiuce)).length;
  const puedeAvanzar = etapaFormulario === 1 ? Boolean(estudianteId && tipo)
    : etapaFormulario === 2 ? descripcion.trim().length >= 10
      : etapaFormulario === 3 ? notificacion.trim().length >= 4
        : etapaFormulario === 4 ? Boolean(pasoSeleccionado)
          : true;
  const etapas = ['Estudiante y situación', 'Identificación de los hechos', 'Personas relacionadas', 'Medidas pedagógicas', 'Compromisos', 'Seguimiento'];

  function manejarTeclaFormulario(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Enter' || etapaFormulario === 6 || event.target instanceof HTMLTextAreaElement) return;
    event.preventDefault();
    if (puedeAvanzar) setEtapaFormulario((value) => Math.min(value + 1, 6));
  }

  return <section className="workspace-panel coexistence-workspace">
    <ModuleHeader icon={<svg viewBox="0 0 24 24"><path d="M12 3 4 6.5v5.2c0 4.3 3.2 7.7 8 9.3 4.8-1.6 8-5 8-9.3V6.5z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>} kicker="Convivencia escolar" title="Ruta de Convivencia" description="Documenta el debido proceso y aplica los pasos RAICE definidos por el manual institucional." action={<button type="button" className="ui-button ui-button--primary" onClick={() => { if (mostrarFormulario) { setMostrarFormulario(false); setEtapaFormulario(1); } else { setMostrarFormulario(true); } setFeedback(null); }}>{mostrarFormulario ? 'Cerrar formulario' : 'Activar ruta'}</button>} />
    {feedback && <p className={`feedback ${feedback.tipo}`} role="status">{feedback.texto}</p>}
    <KpiGrid label="Resumen de convivencia" items={[{ label: 'Procesos registrados', value: cargando ? '—' : casos.length, detail: 'Historial institucional', icon: '01' }, { label: 'Casos abiertos', value: cargando ? '—' : abiertos, detail: 'Requieren seguimiento', icon: '02' }, { label: 'Marcados para SIUCE', value: cargando ? '—' : siuce, detail: 'Casos con valoración', icon: '03' }]} />
    <section className="coexistence-raice" aria-labelledby="raice-title"><header><span>Proceso institucional</span><h3 id="raice-title">Ruta RAICE</h3><p>Una secuencia documentada para reconocer, atender y acompañar cada situación.</p></header><ol>{['Reconocer', 'Atender', 'Informar', 'Comprometer', 'Evaluar'].map((nombre, index) => <li key={nombre}><b>{index + 1}</b><div><strong>{nombre}</strong><small>{['Identificar los hechos', 'Aplicar medidas inmediatas', 'Vincular a responsables', 'Definir acuerdos', 'Dar seguimiento'][index]}</small></div></li>)}</ol></section>
    {manual && <section className="coexistence-manual"><header><div><span>Manual institucional</span><h3>Clasificación de situaciones</h3><p>Protocolos y competencia aplicable según el nivel de la situación.</p></div><small>{manual.fuente}</small></header><div>{manual.tipos.map((item) => <article key={item.tipo} className={`coexistence-manual-card coexistence-manual-card--${item.tipo.replaceAll(' ', '-').toLowerCase()}`}><div><span>{item.tipo}</span>{item.requiereSiuce && <em>Valorar SIUCE</em>}</div><h4>{item.articulo}</h4><p>{item.descripcion}</p><dl><div><dt>Competencia</dt><dd>{item.competencia}</dd></div><div><dt>Protocolo</dt><dd>{item.accion}</dd></div></dl><details><summary>Ver situaciones tipificadas</summary><ul>{manual.situacionesTipificadas[item.tipo].map((situacion) => <li key={situacion}>{situacion}</li>)}</ul></details></article>)}</div></section>}
    {mostrarFormulario && <form ref={formularioRef} className="coexistence-form" onSubmit={registrar} onKeyDown={manejarTeclaFormulario}>
      <div className="coexistence-form-heading"><div><span>Nueva activación</span><h3>Formulario RAICE</h3><p>Completa la ruta por etapas. Los campos con * son obligatorios.</p></div><strong>Etapa {etapaFormulario} de 6</strong></div>
      <ol className="coexistence-form-progress">{etapas.map((nombre, index) => <li key={nombre} className={index + 1 === etapaFormulario ? 'active' : index + 1 < etapaFormulario ? 'complete' : ''}><b>{index + 1}</b><span>{nombre}</span></li>)}</ol>
      <div className="coexistence-form-grid">
        {etapaFormulario === 1 && <><div className="coexistence-student-search"><StudentSearch estudiantes={estudiantes} value={estudianteId} onChange={(alumno) => setEstudianteId(alumno ? String(alumno.id) : '')} /></div><label><span>Clasificación *</span><select value={tipo} onChange={(event) => { setTipo(event.target.value as TipoSituacion); setPaso(''); }}><option>Tipo I</option><option>Tipo II</option><option>Tipo III</option></select></label>{regla && <div className={`coexistence-rule coexistence-rule--${tipo.replaceAll(' ', '-').toLowerCase()}`}><strong>{regla.articulo} · Acción {regla.accion}</strong><p>{regla.descripcion}</p><small>Competencia: {regla.competencia}</small>{regla.requiereSiuce && <em>Requiere valoración para registro SIUCE</em>}</div>}</>}
        {etapaFormulario === 2 && <label className="coexistence-description"><span>Descripción verificable de los hechos *</span><textarea value={descripcion} minLength={10} maxLength={2000} onChange={(event) => setDescripcion(event.target.value)} placeholder="Describe qué ocurrió, cuándo, dónde y las personas relacionadas." required /><small>{descripcion.length}/2000</small></label>}
        {etapaFormulario === 3 && <><label className="coexistence-wide-field"><span>Notificación al acudiente *</span><input value={notificacion} minLength={4} maxLength={300} onChange={(event) => setNotificacion(event.target.value)} placeholder="Ej. Llamada realizada el 30/08/2026" required /><small>Registra el medio, la fecha y la persona contactada.</small></label><div className="coexistence-stage-note"><strong>Personas relacionadas</strong><p>La persona estudiante y su acudiente quedan vinculados a partir de la información institucional existente.</p></div></>}
        {etapaFormulario === 4 && <><label className="coexistence-wide-field"><span>Paso RAICE y medida aplicable *</span><select value={paso} onChange={(event) => setPaso(event.target.value)} required><option value="">Seleccionar paso aplicable</option>{pasos.map((item) => <option key={item.paso} value={item.paso}>Paso {item.paso} · {item.nombre}</option>)}</select>{pasoSeleccionado && <small>Responsable: {pasoSeleccionado.responsable}</small>}</label></>}
        {etapaFormulario === 5 && <><section className="coexistence-evidence-upload" aria-labelledby="coexistence-evidence-title"><span id="coexistence-evidence-title">Documento de soporte (opcional)</span><p>Adjunta el acta, compromiso, imagen o documento que sustenta la activación.</p><EvidenceUpload files={archivosEvidencia} onChange={setArchivosEvidencia} disabled={guardando} maxFiles={1} /></section><div className="coexistence-stage-note"><strong>Compromiso institucional</strong><p>La activación conservará la clasificación, el responsable y la notificación registrada para su seguimiento.</p></div></>}
        {etapaFormulario === 6 && <div className="coexistence-review"><header><span>Revisión final</span><h4>Confirma la activación de la ruta</h4></header><dl><div><dt>Estudiante</dt><dd>{estudiante?.nombre || 'Sin seleccionar'}</dd></div><div><dt>Clasificación</dt><dd>{tipo}</dd></div><div><dt>Etapa</dt><dd>{pasoSeleccionado ? `Paso ${pasoSeleccionado.paso} · ${pasoSeleccionado.nombre}` : 'Sin seleccionar'}</dd></div><div><dt>Responsable</dt><dd>{pasoSeleccionado?.responsable || 'Sin asignar'}</dd></div><div><dt>Notificación</dt><dd>{notificacion || 'Sin registrar'}</dd></div><div><dt>Seguimiento</dt><dd>{regla?.requiereSiuce ? 'Requiere valoración SIUCE' : 'Seguimiento institucional'}</dd></div></dl><p>{descripcion}</p></div>}
      </div>
      <div className="coexistence-form-actions"><p>Fuente: {manual?.fuente || 'Manual institucional'}</p><div>{etapaFormulario > 1 && <button type="button" className="ui-button ui-button--neutral" onClick={() => setEtapaFormulario((value) => value - 1)}>Anterior</button>}{etapaFormulario < 6 ? <button type="button" className="ui-button ui-button--primary" disabled={!puedeAvanzar} onClick={() => setEtapaFormulario((value) => value + 1)}>Continuar</button> : <button type="submit" className="ui-button ui-button--primary" disabled={guardando || !estudiante || !pasoSeleccionado}>{guardando ? 'Registrando...' : 'Activar ruta de convivencia'}</button>}</div></div>
    </form>}
    <div className="coexistence-history"><div className="module-filter-bar"><label className="module-search-field"><span>Buscar proceso</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Estudiante, tipo, etapa o responsable" /></label></div><div className="module-list-heading"><strong>Historial de convivencia</strong><span>{cargando ? 'Cargando...' : `${filtrados.length} procesos`}</span></div><div className="coexistence-table-wrap" tabIndex={0} role="region" aria-label="Historial de convivencia"><table><thead><tr><th>Estudiante</th><th>Clasificación</th><th>Etapa RAICE</th><th>Responsable</th><th>Registro</th><th>Estado</th></tr></thead><tbody>{filtrados.map((caso) => <tr key={caso.id} onClick={() => setCasoSeleccionado(caso)}><td><button type="button" className="coexistence-open-case" onClick={() => setCasoSeleccionado(caso)}><strong>{caso.estudiante}</strong><small>{caso.grado} · Ver expediente</small></button></td><td><span className={`coexistence-type coexistence-type--${caso.tipo.replaceAll(' ', '-').toLowerCase()}`}>{caso.tipo}</span>{Boolean(caso.requiereSiuce) && <small>Validar SIUCE</small>}</td><td><strong>{caso.etapa}</strong><small>{caso.competencia}</small></td><td>{caso.creadoPorNombre}<small>{caso.creadoPorRol}</small></td><td><time dateTime={caso.creadoEn}>{fechaLegible(caso.creadoEn)}</time></td><td><span className="module-status module-status--activa">{caso.estado}</span></td></tr>)}</tbody></table>{!cargando && filtrados.length === 0 && <div className="module-empty-state"><strong>Sin procesos registrados</strong><p>Activa la ruta cuando exista una situación que deba documentarse.</p></div>}</div></div>
    {casoSeleccionado && <div className="coexistence-modal-backdrop" role="presentation" onMouseDown={() => setCasoSeleccionado(null)}><article className="coexistence-detail-modal" role="dialog" aria-modal="true" aria-labelledby="coexistence-detail-title" onMouseDown={(event) => event.stopPropagation()}><header><div><span>Proceso #{casoSeleccionado.id}</span><h3 id="coexistence-detail-title">{casoSeleccionado.estudiante}</h3><p>{casoSeleccionado.grado} · registrado {fechaLegible(casoSeleccionado.creadoEn)}</p></div><button type="button" aria-label="Cerrar detalle" onClick={() => setCasoSeleccionado(null)}>×</button></header><div className="coexistence-detail-body"><div className="coexistence-detail-status"><span className={`coexistence-type coexistence-type--${casoSeleccionado.tipo.replaceAll(' ', '-').toLowerCase()}`}>{casoSeleccionado.tipo}</span><span className="module-status module-status--activa">{casoSeleccionado.estado}</span>{Boolean(casoSeleccionado.requiereSiuce) && <em>Validar SIUCE</em>}</div><dl><div><dt>Etapa RAICE</dt><dd>{casoSeleccionado.etapa}</dd></div><div><dt>Competencia</dt><dd>{casoSeleccionado.competencia}</dd></div><div><dt>Responsable</dt><dd>{casoSeleccionado.creadoPorNombre} · {casoSeleccionado.creadoPorRol}</dd></div><div><dt>Notificación al acudiente</dt><dd>{casoSeleccionado.notificacionAcudiente}</dd></div></dl><section><span>Hechos registrados</span><p>{casoSeleccionado.descripcion}</p></section>{casoSeleccionado.evidencia && <a href={casoSeleccionado.evidencia} target="_blank" rel="noreferrer">Descargar {casoSeleccionado.evidenciaNombre || 'documento adjunto'}</a>}</div><footer><button type="button" className="ui-button ui-button--primary" onClick={() => setCasoSeleccionado(null)}>Cerrar expediente</button></footer></article></div>}
  </section>;
}
