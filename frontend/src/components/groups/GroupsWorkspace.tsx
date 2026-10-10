'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { coincideBusqueda } from '@/lib/search-normalization';

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
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
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
      return coincideGrado && coincideBusqueda(busqueda, [grupo.grado, grupo.grupo, `${grupo.grado}-${grupo.grupo}`, grupo.jornada, grupo.director?.nombre]);
    });
  }, [busqueda, data.grupos, filtroGrado]);

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

  return <section className="groups-workspace" aria-labelledby="groups-title">
    <header className="groups-heading">
      <div><h2 id="groups-title">Grupos</h2><p>Consulta cada curso, sus estudiantes y el director de grupo asignado.</p></div>
      <div className="groups-summary" aria-label="Resumen de grupos">
        <span><strong>{data.grupos.length}</strong> grupos</span>
        <span><strong>{totalEstudiantes}</strong> estudiantes</span>
        <span><strong>{gruposConDirector}</strong> con director</span>
      </div>
    </header>

    {feedback && !seleccionado && <p className={`feedback ${feedback.tipo}`} role="alert">{feedback.texto}</p>}

    <div className="groups-toolbar">
      <label className="groups-search"><span aria-hidden="true">⌕</span><span className="sr-only">Buscar grupo o director</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar grupo, jornada o director" /></label>
      <label><span className="sr-only">Filtrar por grado</span><select value={filtroGrado} onChange={(event) => setFiltroGrado(event.target.value)}><option>Todos</option>{['6', '7', '8', '9', '10', '11'].map((grado) => <option key={grado} value={grado}>Grado {grado}°</option>)}</select></label>
    </div>

    {cargando ? <div className="groups-loading" role="status">Cargando grupos...</div> : gruposVisibles.length ? <div className="groups-grid">
      {gruposVisibles.map((grupo) => <button type="button" className="group-card" key={`${grupo.grado}-${grupo.grupo}`} onClick={() => abrirGrupo(grupo)} aria-label={`Abrir grupo ${grupo.grado}-${grupo.grupo}`}>
        <span className={`group-card-shift group-card-shift--${grupo.jornada.toLocaleLowerCase('es')}`}>{grupo.jornada}</span>
        <strong>{grupo.grado}<sup>°</sup><b>{grupo.grupo}</b></strong>
        <span className="group-card-course">Grado {grupo.grado} · Grupo {grupo.grupo}</span>
        <span className="group-card-divider" />
        <span className="group-card-meta"><span><i aria-hidden="true">♙</i>{grupo.estudiantes.length} estudiante{grupo.estudiantes.length === 1 ? '' : 's'}</span><span className={grupo.director ? '' : 'group-card-unassigned'}>{grupo.director ? grupo.director.nombre : 'Sin director'}</span></span>
        <span className="group-card-open">Ver grupo <b aria-hidden="true">›</b></span>
      </button>)}
    </div> : <div className="groups-empty"><strong>No encontramos grupos</strong><p>Ajusta la búsqueda o el filtro de grado.</p></div>}

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
