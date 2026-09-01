'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { Estudiante } from '@/types/students';

type Notificacion = {
  id: number;
  acudienteId: number;
  reporteId: number | null;
  canal: 'email' | 'app';
  asunto: string;
  mensaje: string;
  leida: boolean | number;
  enviadoEn: string;
  acudiente: string;
  correo: string;
  telefono: string;
  estudianteId: number | null;
  estudiante: string | null;
  grado: string | null;
  grupo: string | null;
};

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

export default function CommunicationsWorkspace() {
  const [estudiantes, setEstudiantes] = useState<Estudiante[]>([]);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [estudianteId, setEstudianteId] = useState('');
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [canal, setCanal] = useState<'app' | 'email'>('app');
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const cargar = useCallback(async () => {
    const [estudiantesResponse, notificacionesResponse] = await Promise.all([
      fetch('/api/estudiantes', { cache: 'no-store' }),
      fetch('/api/notificaciones', { cache: 'no-store' }),
    ]);
    if (!estudiantesResponse.ok) throw new Error(await leerError(estudiantesResponse, 'No se pudieron cargar los estudiantes.'));
    if (!notificacionesResponse.ok) throw new Error(await leerError(notificacionesResponse, 'No se pudo cargar el historial.'));
    const dataEstudiantes = await estudiantesResponse.json() as Estudiante[];
    setEstudiantes(dataEstudiantes.filter((item) => item.activo && !item.archivado));
    setNotificaciones(await notificacionesResponse.json() as Notificacion[]);
  }, []);

  useEffect(() => {
    let activa = true;
    const timer = window.setTimeout(() => {
      void cargar().catch((error) => {
        if (activa) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir comunicaciones.' });
      }).finally(() => { if (activa) setCargando(false); });
    }, 0);
    return () => { activa = false; window.clearTimeout(timer); };
  }, [cargar]);

  const estudiante = estudiantes.find((item) => item.id === Number(estudianteId)) ?? null;
  const filtradas = useMemo(() => {
    const termino = busqueda.trim().toLocaleLowerCase('es');
    if (!termino) return notificaciones;
    return notificaciones.filter((item) => [item.asunto, item.mensaje, item.acudiente, item.estudiante, item.correo].join(' ').toLocaleLowerCase('es').includes(termino));
  }, [busqueda, notificaciones]);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!estudiante) return;
    setGuardando(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/notificaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acudienteId: estudiante.acudiente.id, asunto, mensaje, canal }),
      });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo registrar el comunicado.'));
      const creada = await response.json() as { correoEnviado?: boolean; aviso?: string | null };
      setAsunto('');
      setMensaje('');
      setFeedback({
        tipo: 'success',
        texto: creada.aviso || (canal === 'email' && creada.correoEnviado ? 'Comunicado registrado y enviado por correo.' : 'Comunicado registrado en el historial institucional.'),
      });
      await cargar();
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo registrar el comunicado.' });
    } finally {
      setGuardando(false);
    }
  }

  async function marcarLeida(id: number) {
    const response = await fetch(`/api/notificaciones/${id}`, { method: 'PATCH' });
    if (response.ok) setNotificaciones((actuales) => actuales.map((item) => item.id === id ? { ...item, leida: true } : item));
  }

  const correos = notificaciones.filter((item) => item.canal === 'email').length;
  const noLeidas = notificaciones.filter((item) => !Boolean(item.leida)).length;

  return <section className="workspace-panel communications-workspace">
    <header className="module-page-heading"><div className="module-title"><h2>Comunicaciones</h2><p>Registra mensajes a acudientes y conserva su trazabilidad institucional.</p></div></header>
    {feedback && <p className={`feedback ${feedback.tipo}`} role="status">{feedback.texto}</p>}
    <div className="module-kpi-grid">
      <article><span>Comunicaciones</span><strong>{notificaciones.length}</strong><small>Historial registrado</small></article>
      <article><span>Canal correo</span><strong>{correos}</strong><small>Intentos de envío documentados</small></article>
      <article><span>Sin revisar</span><strong>{noLeidas}</strong><small>Registros internos pendientes</small></article>
    </div>
    <div className="communications-layout">
      <form className="communications-compose" onSubmit={enviar}>
        <div className="compose-heading"><span>Nuevo comunicado</span><h3>Mensaje al acudiente</h3><p>Usa información necesaria, clara y respetuosa.</p></div>
        <label><span>Estudiante *</span><select value={estudianteId} onChange={(event) => setEstudianteId(event.target.value)} required><option value="">Seleccionar estudiante</option>{estudiantes.map((item) => <option key={item.id} value={item.id}>{item.nombre} · {item.grado}-{item.grupo}</option>)}</select></label>
        {estudiante && <div className="communication-recipient"><span>{estudiante.acudiente.nombre.slice(0, 1).toUpperCase()}</span><div><strong>{estudiante.acudiente.nombre}</strong><small>{estudiante.acudiente.correo || estudiante.acudiente.telefono || estudiante.acudiente.contacto}</small></div></div>}
        <label><span>Canal *</span><select value={canal} onChange={(event) => setCanal(event.target.value as 'app' | 'email')}><option value="app">Registro interno</option><option value="email">Correo electrónico</option></select><small>{canal === 'email' ? 'El envío requiere credenciales de correo configuradas.' : 'Queda documentado sin afirmar una entrega externa.'}</small></label>
        <label><span>Asunto *</span><input value={asunto} minLength={4} maxLength={160} onChange={(event) => setAsunto(event.target.value)} placeholder="Ej. Citación de seguimiento" required /></label>
        <label><span>Mensaje *</span><textarea value={mensaje} minLength={10} maxLength={3000} onChange={(event) => setMensaje(event.target.value)} placeholder="Escribe el motivo, fecha y próximos pasos." required /><small>{mensaje.length}/3000</small></label>
        <button type="submit" className="module-primary-action" disabled={guardando || !estudiante}>{guardando ? 'Registrando...' : canal === 'email' ? 'Registrar y enviar' : 'Registrar comunicado'}</button>
      </form>
      <div className="communications-history">
        <div className="module-filter-bar"><label className="module-search-field"><span>Buscar historial</span><input type="search" value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Asunto, estudiante o acudiente" /></label></div>
        <div className="module-list-heading"><strong>Historial</strong><span>{cargando ? 'Cargando...' : `${filtradas.length} registros`}</span></div>
        <div className="communications-list">
          {!cargando && filtradas.length === 0 && <div className="module-empty-state"><strong>Sin comunicaciones</strong><p>Los mensajes registrados aparecerán aquí.</p></div>}
          {filtradas.map((item) => <article key={item.id} className={Boolean(item.leida) ? 'communication-row communication-row--read' : 'communication-row'}>
            <span className={`communication-channel communication-channel--${item.canal}`}>{item.canal === 'email' ? '@' : '✓'}</span>
            <div><div className="communication-row-heading"><strong>{item.asunto}</strong><span>{item.canal === 'email' ? 'Correo' : 'Interno'}</span></div><p>{item.mensaje}</p><small>{item.acudiente}{item.estudiante ? ` · ${item.estudiante}` : ''} · {fechaLegible(item.enviadoEn)}</small></div>
            {!Boolean(item.leida) && <button type="button" onClick={() => void marcarLeida(item.id)}>Marcar revisada</button>}
          </article>)}
        </div>
      </div>
    </div>
  </section>;
}
