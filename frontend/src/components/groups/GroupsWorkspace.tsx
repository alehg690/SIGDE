'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';
import { coincideBusqueda } from '@/lib/search-normalization';
import ModuleHeader from '@/components/ui/ModuleHeader';
import KpiGrid from '@/components/ui/KpiGrid';

type Persona = { id: number; nombre: string; correo: string };
type EstudianteGrupo = { id: number; nombre: string; estado: string };
type Grupo = {
  id: number | null;
  grado: string;
  grupo: string;
  jornada: string;
  director: Persona | null;
  estudiantes: EstudianteGrupo[];
};
type GruposResponse = { grupos: Grupo[]; docentes: Persona[] };
type Feedback = { tipo: 'success' | 'error'; texto: string };

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function iniciales(nombre: string) {
  return nombre.split(/\s+/).filter(Boolean).slice(0, 2).map((parte) => parte[0]).join('').toUpperCase();
}

export default function GroupsWorkspace({ canManage }: { canManage: boolean }) {
  const [data, setData] = useState<GruposResponse>({ grupos: [], docentes: [] });
  const [seleccionado, setSeleccionado] = useState<Grupo | null>(null);
  const [directorId, setDirectorId] = useState('');
  const [filtroGrado, setFiltroGrado] = useState('Todos');
  const [filtroJornada, setFiltroJornada] = useState('Todas');
  const [filtroDirector, setFiltroDirector] = useState('Todos');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  useAutoDismiss(Boolean(feedback), () => setFeedback(null));
  useDialogFocus<HTMLElement>(Boolean(seleccionado), () => setSeleccionado(null), !guardando);

  const cargar = useCallback(async () => {
    const response = await fetch('/api/grupos', { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudieron cargar los grupos.'));
    const resultado = await response.json() as GruposResponse;
    setData(resultado);
    return resultado;
  }, []);

  useEffect(() => {
    let activo = true;
    const timer = window.setTimeout(() => {
      void cargar()
        .catch((error) => {
          if (activo) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir el módulo.' });
        })
        .finally(() => { if (activo) setCargando(false); });
    }, 0);
    return () => { activo = false; window.clearTimeout(timer); };
  }, [cargar]);

  const gruposVisibles = useMemo(() => {
    return data.grupos.filter((grupo) => {
      const coincideGrado = filtroGrado === 'Todos' || grupo.grado === filtroGrado;
      const coincideJornada = filtroJornada === 'Todas' || grupo.jornada === filtroJornada;
      const coincideDirector = filtroDirector === 'Todos' || (filtroDirector === 'Asignado' ? Boolean(grupo.director) : !grupo.director);
      return coincideGrado && coincideJornada && coincideDirector && coincideBusqueda(busqueda, [grupo.grado, grupo.grupo, `${grupo.grado}-${grupo.grupo}`, grupo.jornada, grupo.director?.nombre]);
    });
  }, [busqueda, data.grupos, filtroDirector, filtroGrado, filtroJornada]);

  function abrirGrupo(grupo: Grupo) {
    setSeleccionado(grupo);
    setDirectorId(grupo.director ? String(grupo.director.id) : '');
    setFeedback(null);
  }

  async function guardarDirector() {
    if (!seleccionado || !canManage) return;
    setGuardando(true);
    setFeedback(null);
    try {
      const response = await fetch(`/api/grupos/${seleccionado.grado}/${seleccionado.grupo}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directorId: directorId ? Number(directorId) : null }),
      });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo actualizar el director de grupo.'));
      const resultado = await cargar();
      const actualizado = resultado.grupos.find((grupo) => grupo.grado === seleccionado.grado && grupo.grupo === seleccionado.grupo) || null;
      setSeleccionado(actualizado);
      setFeedback({ tipo: 'success', texto: directorId ? 'Director de grupo actualizado correctamente.' : 'El grupo quedó sin director asignado.' });
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo actualizar el director de grupo.' });
    } finally {
      setGuardando(false);
    }
  }

  const totalEstudiantes = data.grupos.reduce((total, grupo) => total + grupo.estudiantes.length, 0);
  const gruposConDirector = data.grupos.filter((grupo) => grupo.director).length;

  return <section className="groups-workspace ui-workspace" aria-label="Gestión de grupos escolares">
    <ModuleHeader
      kicker="Organización académica"
      title="Grupos escolares"
      description="Consulta la conformación de cada curso y administra la asignación de directores de grupo."
      icon={<svg viewBox="0 0 24 24"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"/></svg>}
    />
    <KpiGrid label="Resumen de grupos" items={[
      { label: 'Grupos', value: cargando ? '—' : data.grupos.length, detail: 'Cursos configurados', icon: <svg viewBox="0 0 24 24"><path d="M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z"/></svg> },
      { label: 'Estudiantes', value: cargando ? '—' : totalEstudiantes, detail: 'Distribuidos por curso', icon: <svg viewBox="0 0 24 24"><path d="m3 9 9-5 9 5-9 5z"/><path d="M7 11.2V16c2.8 2 7.2 2 10 0v-4.8"/></svg> },
      { label: 'Con director', value: cargando ? '—' : gruposConDirector, detail: `${data.grupos.length - gruposConDirector} pendientes de asignación`, icon: <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="4"/><path d="M3 20v-1.5A3.5 3.5 0 0 1 6.5 15h5a3.5 3.5 0 0 1 3.5 3.5V20m2-8 2 2 3-4"/></svg> },
    ]} />

    {feedback && !seleccionado && <p className={`feedback ${feedback.tipo}`} role="alert">{feedback.texto}</p>}

    <div className="groups-toolbar">
      <label className="groups-search"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar grupo o director</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar grupo, jornada o director" /></label>
      <label><span className="groups-filter-label">Grado</span><select aria-label="Filtrar por grado" value={filtroGrado} onChange={(event) => setFiltroGrado(event.target.value)}><option>Todos</option>{['6', '7', '8', '9', '10', '11'].map((grado) => <option key={grado} value={grado}>Grado {grado}°</option>)}</select></label>
      <label><span className="groups-filter-label">Jornada</span><select aria-label="Filtrar por jornada" value={filtroJornada} onChange={(event) => setFiltroJornada(event.target.value)}><option>Todas</option><option>Mañana</option><option>Tarde</option></select></label>
      <label><span className="groups-filter-label">Director</span><select aria-label="Filtrar por director" value={filtroDirector} onChange={(event) => setFiltroDirector(event.target.value)}><option>Todos</option><option value="Asignado">Asignado</option><option value="Sin asignar">Sin asignar</option></select></label>
    </div>

    <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{cargando ? 'Cargando grupos.' : `${gruposVisibles.length} ${gruposVisibles.length === 1 ? 'grupo encontrado' : 'grupos encontrados'}.`}</p>
    {cargando ? <div className="groups-grid groups-grid--loading" role="status" aria-label="Cargando grupos">{Array.from({ length: 8 }, (_, index) => <article className="group-card-skeleton" key={index}><span/><strong/><i/><i/></article>)}</div> : gruposVisibles.length ? <div className="groups-grid">
      {gruposVisibles.map((grupo) => <button type="button" className="group-card" key={`${grupo.grado}-${grupo.grupo}`} onClick={() => abrirGrupo(grupo)} aria-label={`Abrir grupo ${grupo.grado}-${grupo.grupo}`}>
        <span className={`group-card-shift group-card-shift--${grupo.jornada.toLocaleLowerCase('es')}`}>{grupo.jornada}</span>
        <strong>{grupo.grado}<sup>°</sup><b>{grupo.grupo}</b></strong>
        <span className="group-card-course">Grado {grupo.grado} · Grupo {grupo.grupo}</span>
        <span className="group-card-divider" />
        <span className="group-card-meta"><span><i aria-hidden="true">♙</i>{grupo.estudiantes.length} estudiante{grupo.estudiantes.length === 1 ? '' : 's'}</span><span className={grupo.director ? '' : 'group-card-unassigned'}>{grupo.director ? grupo.director.nombre : 'Sin director'}</span></span>
        <span className="group-card-open">Ver grupo <b aria-hidden="true">›</b></span>
      </button>)}
    </div> : <div className="groups-empty"><span aria-hidden="true">⌕</span><strong>No encontramos grupos</strong><p>Ajusta la búsqueda o alguno de los filtros.</p></div>}

    {seleccionado && <div className="group-detail-backdrop" role="presentation" onMouseDown={() => { if (!guardando) setSeleccionado(null); }}>
      <section className="group-detail" role="dialog" aria-modal="true" aria-labelledby="group-detail-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div className="group-detail-grade"><strong>{seleccionado.grado}<sup>°</sup><b>{seleccionado.grupo}</b></strong><span>{seleccionado.jornada}</span></div>
          <div><span className="group-detail-eyebrow">Información del grupo</span><h3 id="group-detail-title">Grado {seleccionado.grado} · Grupo {seleccionado.grupo}</h3><p>{seleccionado.estudiantes.length} estudiante{seleccionado.estudiantes.length === 1 ? '' : 's'} registrado{seleccionado.estudiantes.length === 1 ? '' : 's'}</p></div>
          <button type="button" aria-label="Cerrar" disabled={guardando} onClick={() => setSeleccionado(null)}>×</button>
        </header>
        <div className="group-detail-body">
          {feedback && <p className={`feedback ${feedback.tipo}`} role="alert">{feedback.texto}</p>}
          <section className="group-director-panel" aria-labelledby="group-director-title">
            <div><span className="group-director-avatar">{seleccionado.director ? iniciales(seleccionado.director.nombre) : '?'}</span><div><small id="group-director-title">Director de grupo</small><strong>{seleccionado.director?.nombre || 'Sin director asignado'}</strong>{seleccionado.director?.correo && <span>{seleccionado.director.correo}</span>}</div></div>
            {canManage && <div className="group-director-editor"><label htmlFor="group-director-select">Modificar director</label><div><select id="group-director-select" value={directorId} disabled={guardando} onChange={(event) => setDirectorId(event.target.value)}><option value="">Sin director asignado</option>{data.docentes.map((docente) => <option key={docente.id} value={docente.id}>{docente.nombre}</option>)}</select><button type="button" disabled={guardando || directorId === String(seleccionado.director?.id ?? '')} onClick={guardarDirector}>{guardando ? 'Guardando...' : 'Guardar cambio'}</button></div></div>}
          </section>
          <section className="group-students" aria-labelledby="group-students-title">
            <header><div><h4 id="group-students-title">Estudiantes del grupo</h4><p>Listado actual de estudiantes no archivados.</p></div><span>{seleccionado.estudiantes.length}</span></header>
            {seleccionado.estudiantes.length ? <ol>{seleccionado.estudiantes.map((estudiante, index) => <li key={estudiante.id}><span className="group-student-number">{String(index + 1).padStart(2, '0')}</span><span className="group-student-avatar">{iniciales(estudiante.nombre)}</span><strong>{estudiante.nombre}</strong><span className={`group-student-status group-student-status--${estudiante.estado.toLocaleLowerCase('es')}`}><i />{estudiante.estado}</span></li>)}</ol> : <div className="group-students-empty"><span aria-hidden="true">♙</span><strong>Aún no hay estudiantes</strong><p>Los estudiantes asignados a este curso aparecerán aquí.</p></div>}
          </section>
        </div>
      </section>
    </div>}
  </section>;
}
