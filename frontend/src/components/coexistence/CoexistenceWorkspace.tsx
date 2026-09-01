'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Estudiante } from '@/types/students';

type TipoSituacion = 'Tipo I' | 'Tipo II' | 'Tipo III';
type Regla = { tipo: TipoSituacion; articulo: string; descripcion: string; competencia: string; accion: string; instancia: string; requiereSiuce: boolean; pasosRaice: number[] };
type Paso = { paso: number; nombre: string; responsable: string; aplicaA: TipoSituacion[] };
type Manual = { fuente: string; tipos: Regla[]; pasosRaice: Paso[]; situacionesTipificadas: Record<TipoSituacion, string[]> };
type Caso = { id: string; estudianteId: string; estudiante: string; grado: string; tipo: TipoSituacion; descripcion: string; etapa: string; competencia: string; notificacionAcudiente: string; requiereSiuce: boolean | number; creadoPorNombre: string; creadoPorRol: string; evidencia: string | null; estado: string; creadoEn: string };
type Feedback = { tipo: 'success' | 'error'; texto: string };

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

function fechaLegible(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(date);
}

export default function CoexistenceWorkspace() {
  const [manual, setManual] = useState<Manual | null>(null);
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [casos, setCasos] = useState<Caso[]>([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [tipo, setTipo] = useState<TipoSituacion>('Tipo I');
  const [descripcion, setDescripcion] = useState('');
  const [paso, setPaso] = useState('');
  const [notificacion, setNotificacion] = useState('');
  const [evidencia, setEvidencia] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

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

  const estudiante = estudiantes.find((item) => item.id === Number(estudianteId)) ?? null;
  const regla = manual?.tipos.find((item) => item.tipo === tipo) ?? null;
  const pasos = manual?.pasosRaice.filter((item) => item.aplicaA.includes(tipo)) ?? [];
  const pasoSeleccionado = pasos.find((item) => item.paso === Number(paso)) ?? pasos[0] ?? null;
  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (!termino) return casos;
    return casos.filter((caso) => [caso.estudiante, caso.grado, caso.tipo, caso.descripcion, caso.etapa, caso.creadoPorNombre].join(' ').toLocaleLowerCase('es').includes(termino));
  }, [busqueda, casos]);

  async function registrar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!estudiante || !regla || !pasoSeleccionado) return;
    setGuardando(true); setFeedback(null);
    try {
      const response = await fetch('/api/convivencia', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
          estudianteId: String(estudiante.id), estudiante: estudiante.nombre, grado: `${estudiante.grado}-${estudiante.grupo}`,
          tipo, descripcion, etapa: `Paso ${pasoSeleccionado.paso}: ${pasoSeleccionado.nombre}`,
          competencia: regla.competencia, notificacionAcudiente: notificacion,
          requiereSiuce: regla.requiereSiuce, evidencia,
        }),
      });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo registrar el proceso.'));
      setEstudianteId(''); setTipo('Tipo I'); setDescripcion(''); setPaso(''); setNotificacion(''); setEvidencia(''); setMostrarFormulario(false);
      setFeedback({ tipo: 'success', texto: 'Proceso de convivencia registrado con la ruta institucional correspondiente.' });
      await cargar();
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo registrar el proceso.' });
    } finally { setGuardando(false); }
  }

  const abiertos = casos.filter((caso) => caso.estado === 'abierto').length;
  const siuce = casos.filter((caso) => Boolean(caso.requiereSiuce)).length;

  return <section className="workspace-panel coexistence-workspace">
    <header className="module-page-heading"><div className="module-title"><h2>Ruta de Convivencia</h2><p>Documenta el debido proceso y aplica los pasos RAICE definidos por el manual institucional.</p></div><button type="button" className="module-primary-action" onClick={() => { setMostrarFormulario((value) => !value); setFeedback(null); }}>{mostrarFormulario ? 'Cerrar formulario' : 'Activar ruta'}</button></header>
    {feedback && <p className={`feedback ${feedback.tipo}`} role="status">{feedback.texto}</p>}
    <div className="module-kpi-grid"><article><span>Procesos registrados</span><strong>{casos.length}</strong><small>Historial institucional</small></article><article><span>Casos abiertos</span><strong>{abiertos}</strong><small>Requieren seguimiento</small></article><article><span>Marcados para SIUCE</span><strong>{siuce}</strong><small>Tipo II, III o condición aplicable</small></article></div>
    {mostrarFormulario && <form className="coexistence-form" onSubmit={registrar}>
      <div className="coexistence-form-heading"><span>Nueva activación</span><h3>Clasificación y ruta de atención</h3><p>El sistema propone la competencia y los pasos; la valoración final siempre corresponde al equipo institucional.</p></div>
      <div className="coexistence-form-grid">
        <label><span>Estudiante *</span><select value={estudianteId} onChange={(event) => setEstudianteId(event.target.value)} required><option value="">Seleccionar estudiante</option>{estudiantes.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.grado}-{item.grupo}</option>)}</select></label>
        <label><span>Clasificación *</span><select value={tipo} onChange={(event) => { setTipo(event.target.value as TipoSituacion); setPaso(''); }}><option>Tipo I</option><option>Tipo II</option><option>Tipo III</option></select></label>
        {regla && <div className={`coexistence-rule coexistence-rule--${tipo.replaceAll(' ', '-').toLowerCase()}`}><strong>{regla.articulo} · Acción {regla.accion}</strong><p>{regla.descripcion}</p><small>Competencia: {regla.competencia}</small>{regla.requiereSiuce && <em>Requiere valoración para registro SIUCE</em>}</div>}
        <label className="coexistence-description"><span>Descripción verificable de los hechos *</span><textarea value={descripcion} minLength={10} maxLength={2000} onChange={(event) => setDescripcion(event.target.value)} placeholder="Describe qué ocurrió, cuándo, dónde y las personas relacionadas." required /><small>{descripcion.length}/2000</small></label>
        <label><span>Paso RAICE *</span><select value={paso} onChange={(event) => setPaso(event.target.value)} required><option value="">Seleccionar paso aplicable</option>{pasos.map((item) => <option key={item.paso} value={item.paso}>Paso {item.paso} · {item.nombre}</option>)}</select>{pasoSeleccionado && <small>Responsable: {pasoSeleccionado.responsable}</small>}</label>
        <label><span>Notificación al acudiente *</span><input value={notificacion} minLength={4} maxLength={300} onChange={(event) => setNotificacion(event.target.value)} placeholder="Ej. Llamada realizada el 30/08/2026" required /></label>
        <label className="coexistence-evidence"><span>Enlace de evidencia (opcional)</span><input type="url" value={evidencia} onChange={(event) => setEvidencia(event.target.value)} placeholder="https://..." /></label>
      </div>
      <div className="coexistence-form-actions"><p>Fuente: {manual?.fuente || 'Manual institucional'}</p><button type="submit" className="module-primary-action" disabled={guardando || !estudiante || !pasoSeleccionado}>{guardando ? 'Registrando...' : 'Registrar activación'}</button></div>
    </form>}
    <div className="coexistence-history"><div className="module-filter-bar"><label className="module-search-field"><span>Buscar proceso</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Estudiante, tipo, etapa o responsable" /></label></div><div className="module-list-heading"><strong>Historial de convivencia</strong><span>{cargando ? 'Cargando...' : `${filtrados.length} procesos`}</span></div><div className="coexistence-table-wrap"><table><thead><tr><th>Estudiante</th><th>Clasificación</th><th>Etapa RAICE</th><th>Responsable</th><th>Registro</th><th>Estado</th></tr></thead><tbody>{filtrados.map((caso) => <tr key={caso.id}><td><strong>{caso.estudiante}</strong><small>{caso.grado}</small></td><td><span className={`coexistence-type coexistence-type--${caso.tipo.replaceAll(' ', '-').toLowerCase()}`}>{caso.tipo}</span>{Boolean(caso.requiereSiuce) && <small>Validar SIUCE</small>}</td><td><strong>{caso.etapa}</strong><small>{caso.competencia}</small></td><td>{caso.creadoPorNombre}<small>{caso.creadoPorRol}</small></td><td><time dateTime={caso.creadoEn}>{fechaLegible(caso.creadoEn)}</time></td><td><span className="module-status module-status--activa">{caso.estado}</span></td></tr>)}</tbody></table>{!cargando && filtrados.length === 0 && <div className="module-empty-state"><strong>Sin procesos registrados</strong><p>Activa la ruta cuando exista una situación que deba documentarse.</p></div>}</div></div>
  </section>;
}
