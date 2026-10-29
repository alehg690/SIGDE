'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useDialogFocus } from '@/hooks/useDialogFocus';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';
import ModuleHeader from '@/components/ui/ModuleHeader';

type Evento = { id: number; titulo: string; iniciaEn: string; finalizaEn: string | null; descripcion: string | null; ubicacion: string | null; tipo: string; color: string; todoElDia: number | boolean };
type FormEvento = { titulo: string; fecha: string; fechaFin: string; hora: string; horaFin: string; esRango: boolean; conHora: boolean; tipo: string; color: string; descripcion: string };
type Vista = 'mes' | 'semana';
const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const TIPOS = ['Reunión', 'Académico', 'Evento', 'Citación', 'Salud', 'Capacitación', 'Administrativo'];
const COLORES = ['azul', 'verde', 'amarillo', 'rojo', 'morado', 'cian'];
const COLOR_LABELS: Record<string, string> = { azul: 'Azul', verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo', morado: 'Morado', cian: 'Cian' };
const hoy = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const utc = (date: string) => new Date(`${date}T00:00:00Z`);
function sumarDias(date: string, days: number) { const value = utc(date); value.setUTCDate(value.getUTCDate() + days); return value.toISOString().slice(0, 10); }
const inicioSemana = (date: string) => sumarDias(date, -utc(date).getUTCDay());
const fechaEvento = (date: string) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(date));
const fechaLegible = (date: string, options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('es-CO', { ...options, timeZone: 'UTC' }).format(utc(date));
const horaEvento = (evento: Evento) => Boolean(evento.todoElDia) ? 'Durante el día' : new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).format(new Date(evento.iniciaEn));
const colorEvento = (color: string) => `calendar-color--${COLORES.includes(color) ? color : 'azul'}`;
const formVacio = (fecha = hoy()): FormEvento => ({ titulo: '', fecha, fechaFin: fecha, hora: '08:00', horaFin: '09:00', esRango: false, conHora: false, tipo: 'Reunión', color: 'azul', descripcion: '' });
const horaValor = (iso: string) => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso));
const horaLegible = (iso: string) => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
const fechaFinalEvento = (evento: Evento) => fechaEvento(evento.finalizaEn || evento.iniciaEn);
const periodoEvento = (evento: Evento) => {
  const inicio = fechaEvento(evento.iniciaEn);
  const fin = fechaFinalEvento(evento);
  if (Boolean(evento.todoElDia)) return inicio === fin ? 'Durante el día' : `${fechaLegible(inicio, { day: 'numeric', month: 'short' })} – ${fechaLegible(fin, { day: 'numeric', month: 'short' })}`;
  const horas = evento.finalizaEn ? `${horaEvento(evento)} – ${horaLegible(evento.finalizaEn)}` : horaEvento(evento);
  return inicio === fin ? horas : `${fechaLegible(inicio, { day: 'numeric', month: 'short' })}, ${horaEvento(evento)} – ${fechaLegible(fin, { day: 'numeric', month: 'short' })}, ${horaLegible(evento.finalizaEn!)}`;
};

export default function CalendarWorkspace({ canManage }: { canManage: boolean }) {
  const [vista, setVista] = useState<Vista>('mes');
  const [ancla, setAncla] = useState(hoy);
  const [seleccionado, setSeleccionado] = useState<string | null>(hoy);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [eventosProximos, setEventosProximos] = useState<Evento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [eventoEditando, setEventoEditando] = useState<Evento | null>(null);
  const [eventoEliminar, setEventoEliminar] = useState<Evento | null>(null);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [form, setForm] = useState<FormEvento>(() => formVacio());
  const modalRef = useDialogFocus<HTMLDivElement>(modalAbierto, () => setModalAbierto(false), !guardando);
  const eliminarRef = useDialogFocus<HTMLDivElement>(Boolean(eventoEliminar), () => setEventoEliminar(null), !guardando);
  useAutoDismiss(Boolean(mensaje), () => setMensaje(''));
  useAutoDismiss(Boolean(error), () => setError(''));
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
    for (const evento of eventos) {
      let date = fechaEvento(evento.iniciaEn);
      const final = fechaFinalEvento(evento);
      for (let index = 0; date <= final && index < 366; index += 1, date = sumarDias(date, 1)) grouped.set(date, [...(grouped.get(date) || []), evento]);
    }
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
  function irAHoy() { const actual = hoy(); setAncla(actual); setSeleccionado(actual); }
  function abrirCrear(fecha = seleccionado || hoy()) { setEventoEditando(null); setForm(formVacio(fecha)); setError(''); setModalAbierto(true); }
  function abrirEditar(evento: Evento) {
    const fecha = fechaEvento(evento.iniciaEn); const fechaFin = fechaFinalEvento(evento); const conHora = !Boolean(evento.todoElDia);
    setEventoEditando(evento); setForm({ titulo: evento.titulo, fecha, fechaFin, hora: conHora ? horaValor(evento.iniciaEn) : '08:00', horaFin: conHora && evento.finalizaEn ? horaValor(evento.finalizaEn) : '09:00', esRango: fecha !== fechaFin, conHora, tipo: evento.tipo, color: evento.color, descripcion: evento.descripcion || '' }); setError(''); setModalAbierto(true);
  }
  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setGuardando(true); setError(''); setMensaje('');
    try {
      const fechaFin = form.esRango ? form.fechaFin : form.fecha;
      if (fechaFin < form.fecha) throw new Error('La fecha de finalización no puede ser anterior a la fecha de inicio.');
      const iniciaEn = new Date(`${form.fecha}T${form.conHora ? form.hora : '00:00'}:00-05:00`);
      const finalizaEn = form.esRango || form.conHora ? new Date(`${fechaFin}T${form.conHora ? form.horaFin : '23:59'}:00-05:00`) : null;
      if (Number.isNaN(iniciaEn.getTime())) throw new Error('Selecciona una fecha válida.');
      if (finalizaEn && finalizaEn <= iniciaEn) throw new Error('La finalización debe ser posterior al inicio del evento.');
      const response = await fetch(eventoEditando ? `/api/eventos/${eventoEditando.id}` : '/api/eventos', { method: eventoEditando ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo: form.titulo, iniciaEn: iniciaEn.toISOString(), finalizaEn: finalizaEn?.toISOString(), tipo: form.tipo, color: form.color, todoElDia: !form.conHora, descripcion: form.descripcion }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo guardar el evento.');
      setModalAbierto(false); setEventoEditando(null); setAncla(form.fecha); setSeleccionado(form.fecha); setMensaje(eventoEditando ? 'Evento actualizado.' : 'Evento registrado.');
      setForm(formVacio(form.fecha));
      await cargar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el evento.'); }
    finally { setGuardando(false); }
  }
  async function eliminar() {
    if (!eventoEliminar) return;
    setGuardando(true); setError(''); setMensaje('');
    try {
      const response = await fetch(`/api/eventos/${eventoEliminar.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo eliminar el evento.');
      setEventoEliminar(null); setMensaje('Evento eliminado.'); await cargar();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo eliminar el evento.'); }
    finally { setGuardando(false); }
  }
  const eventosSeleccionados = seleccionado ? porDia.get(seleccionado) || [] : [];
  return <section className="calendar-workspace ui-workspace" aria-label="Calendario institucional">
    <ModuleHeader icon={<svg viewBox="0 0 24 24"><rect x="3.5" y="5.5" width="17" height="15" rx="2"/><path d="M7 3v5m10-5v5M3.5 10h17"/></svg>} kicker="Agenda institucional" title="Calendario" description="Consulta actividades, reuniones y fechas importantes de la comunidad educativa." action={<div className="calendar-heading-actions"><div className="calendar-view-switch" role="group" aria-label="Vista del calendario"><button type="button" className={vista === 'mes' ? 'active' : ''} aria-pressed={vista === 'mes'} onClick={() => setVista('mes')}>Mes</button><button type="button" className={vista === 'semana' ? 'active' : ''} aria-pressed={vista === 'semana'} onClick={() => setVista('semana')}>Semana</button></div>{canManage && <button type="button" className="ui-button ui-button--primary calendar-new-button" onClick={() => abrirCrear()}>＋ Nuevo evento</button>}</div>} />
    {error && <p className="feedback error" role="alert">{error}</p>}{mensaje && <p className="feedback success" role="status">{mensaje}</p>}
    <div className="calendar-layout"><div className="calendar-board"><div className="calendar-period"><div className="calendar-period-navigation"><button type="button" aria-label="Periodo anterior" onClick={() => mover(-1)}>‹</button><button type="button" aria-label="Periodo siguiente" onClick={() => mover(1)}>›</button></div><h3>{periodo}</h3><button type="button" className="calendar-today-button" onClick={irAHoy}>Hoy</button></div><div className="calendar-weekdays">{DIAS.map((day) => <span key={day}>{day}</span>)}</div><div className={`calendar-days calendar-days--${vista}`}>{dias.map((day) => { const dayEvents = porDia.get(day) || []; const visible = vista === 'semana' ? 5 : 2; return <button key={day} type="button" className={`calendar-day${vista === 'mes' && day.slice(0, 7) !== ancla.slice(0, 7) ? ' calendar-day--outside' : ''}${seleccionado === day ? ' calendar-day--selected' : ''}${day === hoy() ? ' calendar-day--today' : ''}`} onClick={() => setSeleccionado(day)} aria-pressed={seleccionado === day} aria-label={`${fechaLegible(day, { weekday: 'long', day: 'numeric', month: 'long' })}, ${dayEvents.length} eventos`}><span className="calendar-day-number">{Number(day.slice(-2))}</span><span className="calendar-day-events">{dayEvents.slice(0, visible).map((item) => <span key={item.id} className={`calendar-event-chip ${colorEvento(item.color)}`} title={item.titulo}>{vista === 'semana' && <small>{horaEvento(item)}</small>}{item.titulo}</span>)}{dayEvents.length > visible && <span className="calendar-more">+{dayEvents.length - visible} más</span>}</span></button>; })}</div>{cargando && <span className="calendar-loading" role="status"><i /> Actualizando calendario…</span>}</div>
      <aside className="calendar-sidebar"><section className="calendar-side-card calendar-selected-card"><header><span>Agenda del día</span><h3>{seleccionado ? fechaLegible(seleccionado, { weekday: 'long', day: 'numeric', month: 'long' }) : 'Selecciona un día'}</h3></header>{seleccionado && <div className="calendar-selected-list">{eventosSeleccionados.length ? eventosSeleccionados.map((item) => <article key={item.id}><i className={`calendar-dot ${colorEvento(item.color)}`} /><div><strong>{item.titulo}</strong><span>{periodoEvento(item)} · {item.tipo}</span>{item.descripcion && <p>{item.descripcion}</p>}{canManage && <div className="calendar-event-actions"><button type="button" onClick={() => abrirEditar(item)}>Editar</button><button type="button" className="danger" onClick={() => setEventoEliminar(item)}>Eliminar</button></div>}</div></article>) : <div className="calendar-side-empty"><span aria-hidden="true">○</span><strong>Sin eventos</strong><p>No hay actividades programadas para este día.</p>{canManage && <button type="button" onClick={() => abrirCrear(seleccionado)}>Crear evento</button>}</div>}</div>}</section><section className="calendar-side-card"><header><span>Próximamente</span><h3>Próximos eventos</h3></header><div className="calendar-upcoming-list">{proximos.length ? proximos.map((item) => <button type="button" key={item.id} aria-label={`Ver ${item.titulo} en el calendario`} onClick={() => { const fecha = fechaEvento(item.iniciaEn); setAncla(fecha); setSeleccionado(fecha); }}><i className={`calendar-dot ${colorEvento(item.color)}`} /><span><strong>{item.titulo}</strong><small>{periodoEvento(item)}</small></span><em className={`calendar-type ${colorEvento(item.color)}`}>{item.tipo}</em><b aria-hidden="true">›</b></button>) : <div className="calendar-side-empty"><span aria-hidden="true">◇</span><strong>Agenda despejada</strong><p>No hay próximos eventos programados.</p></div>}</div></section></aside></div>
    {modalAbierto && <div className="calendar-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !guardando) setModalAbierto(false); }}><div className="calendar-modal" ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="calendar-modal-title"><header><div><span>Agenda institucional</span><h3 id="calendar-modal-title">{eventoEditando ? 'Editar evento' : 'Nuevo evento'}</h3><p>{eventoEditando ? 'Actualiza la programación y los detalles de la actividad.' : 'Programa una actividad para la comunidad educativa.'}</p></div><button type="button" aria-label="Cerrar" disabled={guardando} onClick={() => setModalAbierto(false)}>×</button></header><form onSubmit={guardar}><label><span>Título del evento *</span><input autoFocus required maxLength={120} placeholder="Ej. Reunión de familias" value={form.titulo} onChange={(event) => setForm({ ...form, titulo: event.target.value })} /></label><fieldset className="calendar-duration-options"><legend>Duración del evento</legend><label><input type="checkbox" checked={form.esRango} onChange={(event) => setForm({ ...form, esRango: event.target.checked, fechaFin: event.target.checked ? form.fechaFin || form.fecha : form.fecha })} /><span>Ocurre durante varios días</span></label><label><input type="checkbox" checked={form.conHora} onChange={(event) => setForm({ ...form, conHora: event.target.checked })} /><span>Agregar horario de inicio y fin</span></label></fieldset><div className="calendar-modal-row"><label><span>{form.esRango ? 'Fecha de inicio *' : 'Fecha *'}</span><input type="date" required value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value, fechaFin: form.fechaFin < event.target.value ? event.target.value : form.fechaFin })} /></label>{form.esRango && <label><span>Fecha de finalización *</span><input type="date" required min={form.fecha} value={form.fechaFin} onChange={(event) => setForm({ ...form, fechaFin: event.target.value })} /></label>}</div>{form.conHora && <div className="calendar-modal-row"><label><span>Hora de inicio *</span><input type="time" required value={form.hora} onChange={(event) => setForm({ ...form, hora: event.target.value })} /></label><label><span>Hora de finalización *</span><input type="time" required value={form.horaFin} onChange={(event) => setForm({ ...form, horaFin: event.target.value })} /></label></div>}<label><span>Tipo de evento</span><select value={form.tipo} onChange={(event) => setForm({ ...form, tipo: event.target.value })}>{TIPOS.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label><fieldset className="calendar-color-options"><legend>Color del evento</legend>{COLORES.map((color) => <label key={color} className={`calendar-color-choice ${colorEvento(color)}`} title={COLOR_LABELS[color]}><input type="radio" name="color" aria-label={COLOR_LABELS[color]} value={color} checked={form.color === color} onChange={() => setForm({ ...form, color })} /><span /></label>)}<div className={`calendar-color-preview ${colorEvento(form.color)}`}><i />Así se verá en el calendario</div></fieldset><label><span>Descripción</span><textarea maxLength={1000} placeholder="Agrega información útil para los asistentes…" value={form.descripcion} onChange={(event) => setForm({ ...form, descripcion: event.target.value })} /><small>{form.descripcion.length} / 1.000 caracteres</small></label>{error && <p className="calendar-modal-error" role="alert">{error}</p>}<footer><button type="button" disabled={guardando} onClick={() => setModalAbierto(false)}>Cancelar</button><button type="submit" disabled={guardando}>{guardando ? 'Guardando…' : eventoEditando ? 'Guardar cambios' : 'Crear evento'}</button></footer></form></div></div>}
    {eventoEliminar && <div className="calendar-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !guardando) setEventoEliminar(null); }}><div ref={eliminarRef} tabIndex={-1} className="calendar-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="calendar-delete-title"><span aria-hidden="true">!</span><h3 id="calendar-delete-title">¿Eliminar evento?</h3><p>Se eliminará <strong>{eventoEliminar.titulo}</strong> del calendario institucional. Esta acción no se puede deshacer desde la interfaz.</p><div><button type="button" disabled={guardando} onClick={() => setEventoEliminar(null)}>Cancelar</button><button type="button" className="danger" disabled={guardando} onClick={() => void eliminar()}>{guardando ? 'Eliminando…' : 'Eliminar evento'}</button></div></div></div>}
  </section>;
}
