'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type Evento = { id: number; titulo: string; iniciaEn: string; descripcion: string | null; ubicacion: string | null };

export default function CalendarWorkspace({ canManage }: { canManage: boolean }) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState({ titulo: '', iniciaEn: '', ubicacion: '', descripcion: '' });
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const response = await fetch('/api/eventos', { cache: 'no-store' });
      if (!response.ok) throw new Error('No se pudo cargar la agenda.');
      setEventos(await response.json() as Evento[]);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No hay conexión con el servidor.');
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { const timer = window.setTimeout(() => { void cargar(); }, 0); return () => window.clearTimeout(timer); }, [cargar]);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setGuardando(true); setError(''); setMensaje('');
    try {
      // El formulario siempre expresa la hora institucional de Colombia.
      const iniciaEn = new Date(`${form.iniciaEn}:00-05:00`);
      if (Number.isNaN(iniciaEn.getTime())) throw new Error('Selecciona una fecha y hora válidas.');
      const response = await fetch('/api/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, iniciaEn: iniciaEn.toISOString() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el evento.');
      setForm({ titulo: '', iniciaEn: '', ubicacion: '', descripcion: '' });
      setMensaje('Evento registrado.'); await cargar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el evento.'); }
    finally { setGuardando(false); }
  }

  return <section className="workspace-panel calendar-workspace">
    <header className="module-page-heading"><div className="module-title"><h2>Calendario institucional</h2><p>Consulta los próximos 20 eventos. Las horas corresponden a Colombia.</p></div><button type="button" className="secondary-button" disabled={cargando || guardando} onClick={() => { void cargar(); }}>Actualizar</button></header>
    {error && <p className="feedback error" role="alert">{error}</p>}
    {mensaje && <p className="feedback success" role="status">{mensaje}</p>}
    {canManage && <form className="settings-form" onSubmit={guardar}><fieldset className="settings-card" disabled={guardando}><legend>Registrar evento</legend><div className="settings-fields">
      <label><span>Título</span><input required maxLength={120} value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} /></label>
      <label><span>Fecha y hora (Colombia)</span><input type="datetime-local" required value={form.iniciaEn} onChange={(e) => setForm({ ...form, iniciaEn: e.target.value })} /></label>
      <label><span>Ubicación</span><input maxLength={200} value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} /></label>
      <label><span>Descripción</span><input maxLength={1000} value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} /></label>
    </div><button className="primary-button" type="submit">{guardando ? 'Guardando...' : 'Guardar evento'}</button></fieldset></form>}
    {cargando ? <p role="status">Cargando agenda...</p> : <div className="calendar-events-list"><h3>Próximos eventos</h3>{eventos.length ? eventos.map((evento) => <article key={evento.id}><div><strong>{evento.titulo}</strong><time dateTime={evento.iniciaEn}>{new Intl.DateTimeFormat('es-CO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date(evento.iniciaEn))}</time>{evento.ubicacion && <small>{evento.ubicacion}</small>}{evento.descripcion && <p>{evento.descripcion}</p>}</div></article>) : !error && <p>No hay eventos próximos programados.</p>}</div>}
  </section>;
}
