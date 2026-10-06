'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';

type Evento = { id: number; titulo: string; iniciaEn: string; descripcion: string | null; ubicacion: string | null; tipo: string; color: string; todoElDia: number | boolean };
type Vista = 'mes' | 'semana';
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TIPOS = ['Reunión', 'Académico', 'Evento', 'Citación', 'Salud', 'Capacitación', 'Administrativo'];
const COLORES = ['azul', 'verde', 'amarillo', 'rojo', 'morado', 'cian'];
const hoy = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const utc = (date: string) => new Date(`${date}T00:00:00Z`);
function sumarDias(date: string, days: number) { const value = utc(date); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
const inicioSemana = (date: string) => sumarDias(date, -utc(date).getUTCDay());
const fechaEvento = (date: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
const fechaLegible = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-CO', { ...options, timeZone: 'UTC' }).format(utc(date));
const horaEvento = (evento: Evento) => Boolean(evento.todoElDia) ? 'Durante el día' : new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).format(new Date(evento.iniciaEn));
const colorEvento = (color: string) => `calendar-color--${COLORES.includes(color) ? color : 'azul'}`;

export default function CalendarWorkspace({ canManage }: { canManage: boolean }) {
  const [vista, setVista] = useState<Vista>('mes');
  const [ancla, setAncla] = useState(hoy);
  const [seleccionado, setSeleccionado] = useState<string | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventosProximos, setEventosProximos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState({ titulo: '', fecha: hoy(), hora: '', tipo: 'Reunión', color: 'azul', descripcion: '' });
  useDialogFocus<HTMLElement>(modalAbierto, () => setModalAbierto(false), !guardando);
  const dias = useMemo(() => {
    const first = vista === 'semana' ? inicioSemana(ancla) : inicioSemana(`${ancla.slice(0, 7)}-01`);
    let last: string;
    if (vista === 'semana') last = sumarDias(first, 6);
    else { const monthEnd = utc(`${ancla.slice(0, 7)}-01`); monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1); monthEnd.setUTCDate(0); last = sumarDias(monthEnd.toISOString().slice(0, 10), 6 - monthEnd.getUTCDay()); }
    const count = Math.round((utc(last).getTime() - utc(first).getTime()) / 86400000) + 1;
    return Array.from({ length: count }, (_, index) => sumarDias(first, index));
  }, [ancla, vista]);
  const desde = dias[0];
  const hasta = sumarDias(dias[dias.length - 1], 1);
  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const params = new URLSearchParams({ desde: `${desde}T00:00:00-05:00`, hasta: `${hasta}T00:00:00-05:00` });
      const [response, upcomingResponse] = await Promise.all([fetch(`/api/eventos?${params}`, { cache: 'no-store' }), fetch('/api/eventos', { cache: 'no-store' })]);
      if (!response.ok || !upcomingResponse.ok) throw new Error('No se pudo cargar el calendario.');
      setEventos(await response.json() as Evento[]);
      setEventosProximos(await upcomingResponse.json() as Evento[]);
      setError('');
    } catch (err) { setError(err instanceof Error ? err.message : 'No hay conexión con el servidor.'); }
    finally { setCargando(false); }
  }, [desde, hasta]);
  useEffect(() => { const timer = window.setTimeout(() => { void cargar(); }, 0); return () => window.clearTimeout(timer); }, [cargar]);
  const porDia = useMemo(() => {
    const grouped = new Map<string, Evento[]>();
    for (const evento of eventos) { const date = fechaEvento(evento.iniciaEn); grouped.set(date, [...(grouped.get(date) || []), evento]); }
    return grouped;
  }, [eventos]);
  const proximos = eventosProximos.slice(0, 6);
  const tituloPeriodo = vista === 'mes' ? fechaLegible(`${ancla.slice(0, 7)}-01`, { month: 'long', year: 'numeric' }) : `${fechaLegible(desde, { day: 'numeric', month: 'short' })} – ${fechaLegible(dias[dias.length - 1], { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const periodo = tituloPeriodo.charAt(0).toUpperCase() + tituloPeriodo.slice(1);
  function mover(direction: number) {
    if (vista === 'semana') setAncla(sumarDias(ancla, direction * 7));
    else { const date = utc(`${ancla.slice(0, 7)}-01`); date.setUTCMonth(date.getUTCMonth() + direction); setAncla(date.toISOString().slice(0, 10)); }
    setSeleccionado(null);
  }
  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setGuardando(true); setError(''); setMensaje('');
    try {
      const iniciaEn = new Date(`${form.fecha}T${form.hora || '12:00'}:00-05:00`);
      if (Number.isNaN(iniciaEn.getTime())) throw new Error('Selecciona una fecha válida.');
      const response = await fetch('/api/eventos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: form.titulo, iniciaEn: iniciaEn.toISOString(), tipo: form.tipo, color: form.color, todoElDia: !form.hora, descripcion: form.descripcion }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el evento.');
      setModalAbierto(false); setAncla(form.fecha); setSeleccionado(form.fecha); setMensaje('Evento registrado.');
      setForm({ titulo: '', fecha: form.fecha, hora: '', tipo: 'Reunión', color: 'azul', descripcion: '' });
      await cargar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el evento.'); }
    finally { setGuardando(false); }
  }
  return <section className="workspace-panel calendar-workspace">
    <header className="calendar-heading"><div className="module-title"><h2>Calendario</h2><p>Eventos y actividades institucionales</p></div><div className="calendar-heading-actions"><div className="calendar-view-switch" aria-label="Vista del calendario"><button type="button" className={vista === 'mes' ? 'active' : ''} onClick={() => setVista('mes')}>Mes</button><button type="button" className={vista === 'semana' ? 'active' : ''} onClick={() => setVista('semana')}>Semana</button></div>{canManage && <button type="button" className="calendar-new-button" onClick={() => { setForm({ titulo: '', fecha: seleccionado || hoy(), hora: '', tipo: 'Reunión', color: 'azul', descripcion: '' }); setModalAbierto(true); }}>＋ Nuevo evento</button>}</div></header>
    {error && <p className="feedback error" role="alert">{error}</p>}{mensaje && <p className="feedback success" role="status">{mensaje}</p>}
    <div className="calendar-layout"><div className="calendar-board"><div className="calendar-period"><button type="button" aria-label="Periodo anterior" onClick={() => mover(-1)}>‹</button><h3>{periodo}</h3><button type="button" aria-label="Periodo siguiente" onClick={() => mover(1)}>›</button></div><div className="calendar-weekdays">{DIAS.map((day) => <span key={day}>{day}</span>)}</div><div className={`calendar-days calendar-days--${vista}`}>{dias.map((day) => { const dayEvents = porDia.get(day) || []; const visible = vista === 'semana' ? 5 : 2; return <button key={day} type="button" className={`calendar-day${vista === 'mes' && day.slice(0, 7) !== ancla.slice(0, 7) ? ' calendar-day--outside' : ''}${seleccionado === day ? ' calendar-day--selected' : ''}${day === hoy() ? ' calendar-day--today' : ''}`} onClick={() => setSeleccionado(day)} aria-label={`${fechaLegible(day, { weekday: 'long', day: 'numeric', month: 'long' })}, ${dayEvents.length} eventos`}><span className="calendar-day-number">{Number(day.slice(-2))}</span><span className="calendar-day-events">{dayEvents.slice(0, visible).map((item) => <span key={item.id} className={`calendar-event-chip ${colorEvento(item.color)}`} title={item.titulo}>{item.titulo}</span>)}{dayEvents.length > visible && <span className="calendar-more">+{dayEvents.length - visible} más</span>}</span></button>; })}</div>{cargando && <span className="calendar-loading" role="status">Actualizando eventos...</span>}</div>
      <aside className="calendar-sidebar"><section className="calendar-side-card"><h3>{seleccionado ? fechaLegible(seleccionado, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecciona un día'}</h3>{seleccionado && <div className="calendar-selected-list">{(porDia.get(seleccionado) || []).length ? porDia.get(seleccionado)!.map((item) => <article key={item.id}><i className={`calendar-dot ${colorEvento(item.color)}`} /><div><strong>{item.titulo}</strong><span>{horaEvento(item)} · {item.tipo}</span>{item.descripcion && <p>{item.descripcion}</p>}</div></article>) : <p>No hay eventos para este día.</p>}</div>}</section><section className="calendar-side-card"><h3>Próximos eventos</h3><div className="calendar-upcoming-list">{proximos.length ? proximos.map((item) => <article key={item.id}><i className={`calendar-dot ${colorEvento(item.color)}`} /><div><strong>{item.titulo}</strong><span>{fechaLegible(fechaEvento(item.iniciaEn), { day: 'numeric', month: 'short' })} · {horaEvento(item)}</span></div><em className={`calendar-type ${colorEvento(item.color)}`}>{item.tipo}</em></article>) : <p>No hay próximos eventos en este periodo.</p>}</div></section></aside></div>
    {modalAbierto && <div className="calendar-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setModalAbierto(false); }}><div className="calendar-modal" role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title"><header><h3 id="calendar-modal-title">Crear evento</h3><button type="button" aria-label="Cerrar" onClick={() => setModalAbierto(false)}>×</button></header><form onSubmit={guardar}><label><span>Título del evento</span><input autoFocus required maxLength={120} placeholder="Nombre del evento" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} /></label><div className="calendar-modal-row"><label><span>Fecha</span><input type="date" required value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} /></label><label><span>Hora (opcional)</span><input type="time" value={form.hora} onChange={(event) => setForm({ ...form, hora: event.target.value })} /></label></div><label><span>Tipo</span><select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>{TIPOS.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label><fieldset className="calendar-color-options"><legend>Color</legend>{COLORES.map((color) => <label key={color} className={`calendar-color-choice ${colorEvento(color)}`} title={color}><input type="radio" name="color" value={color} checked={form.color === color} onChange={() => setForm({ ...form, color })} /><span /></label>)}</fieldset><label><span>Descripción</span><textarea maxLength={1000} placeholder="Descripción del evento..." value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /></label><footer><button type="button" onClick={() => setModalAbierto(false)}>Cancelar</button><button type="submit" disabled={guardando}>{guardando ? 'Guardando...' : '✓ Crear evento'}</button></footer></form></div></div>}
  </section>;
}
