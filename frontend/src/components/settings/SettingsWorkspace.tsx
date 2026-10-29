'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { parseReportDate } from '@/lib/report-dates';
import ModuleHeader from '@/components/ui/ModuleHeader';
import { useAutoDismiss } from '@/hooks/useAutoDismiss';

type ConfigRow = { clave: string; valor: string; actualizadoEn: string };
type Feedback = { tipo: 'success' | 'error'; texto: string };
type ConfigForm = {
  institucion: string;
  sede: string;
  codigoDane: string;
  ciudad: string;
  anoLectivo: string;
  fechaInicio: string;
  fechaFin: string;
  numeroPeriodos: string;
  periodoActual: string;
  alertasHabilitadas: string;
  umbralReportes: string;
  periodoDias: string;
};

const ANO_ACTUAL_COLOMBIA = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  timeZone: 'America/Bogota',
}).format(new Date());
const DEFAULTS: ConfigForm = {
  institucion: 'Institución educativa', sede: 'Principal', codigoDane: '', ciudad: '',
  anoLectivo: ANO_ACTUAL_COLOMBIA, fechaInicio: `${ANO_ACTUAL_COLOMBIA}-01-01`, fechaFin: `${ANO_ACTUAL_COLOMBIA}-12-31`, numeroPeriodos: '4', periodoActual: '1',
  alertasHabilitadas: 'true', umbralReportes: '3', periodoDias: '30',
};

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

export default function SettingsWorkspace({ role }: { role: 'admin' | 'coordinador' | 'docente' | 'portero' }) {
  const puedeEditarGestion = role === 'admin' || role === 'coordinador';
  const [form, setForm] = useState<ConfigForm>(DEFAULTS);
  const [guardada, setGuardada] = useState<ConfigForm>(DEFAULTS);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargaCorrecta, setCargaCorrecta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  useAutoDismiss(Boolean(feedback), () => setFeedback(null));

  const cargar = useCallback(async () => {
    const response = await fetch('/api/configuracion', { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudo cargar la configuración.'));
    const rows = await response.json() as ConfigRow[];
    const valores = new Map(rows.map((row) => [row.clave, row.valor]));
    const siguiente = {
      institucion: valores.get('institucion.nombre') || DEFAULTS.institucion,
      sede: valores.get('institucion.sede') || DEFAULTS.sede,
      codigoDane: valores.get('institucion.codigoDane') || DEFAULTS.codigoDane,
      ciudad: valores.get('institucion.ciudad') || DEFAULTS.ciudad,
      anoLectivo: ANO_ACTUAL_COLOMBIA,
      fechaInicio: valores.get('calendario.fechaInicio') || DEFAULTS.fechaInicio,
      fechaFin: valores.get('calendario.fechaFin') || DEFAULTS.fechaFin,
      numeroPeriodos: valores.get('calendario.numeroPeriodos') || DEFAULTS.numeroPeriodos,
      periodoActual: valores.get('calendario.periodoActual') || DEFAULTS.periodoActual,
      alertasHabilitadas: valores.get('alertas.habilitadas') || DEFAULTS.alertasHabilitadas,
      umbralReportes: valores.get('alertas.umbralReportes') || DEFAULTS.umbralReportes,
      periodoDias: valores.get('alertas.periodoDias') || DEFAULTS.periodoDias,
    };
    setForm(siguiente);
    setGuardada(siguiente);
    const fecha = rows.map((row) => new Date(row.actualizadoEn)).filter((date) => !Number.isNaN(date.getTime())).sort((a, b) => b.getTime() - a.getTime())[0];
    setUltimaActualizacion(fecha?.toISOString() ?? null);
    setCargaCorrecta(true);
  }, []);

  useEffect(() => {
    let activa = true;
    const timer = window.setTimeout(() => {
      void cargar().catch((error) => {
        if (activa) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir la configuración.' });
      }).finally(() => { if (activa) setCargando(false); });
    }, 0);
    return () => { activa = false; window.clearTimeout(timer); };
  }, [cargar]);

  const tieneCambios = useMemo(() => Object.keys(form).some((key) => form[key as keyof ConfigForm] !== guardada[key as keyof ConfigForm]), [form, guardada]);
  const cambiosPendientes = useMemo(() => Object.keys(form).filter((key) => form[key as keyof ConfigForm] !== guardada[key as keyof ConfigForm]).length, [form, guardada]);
  const fechasInvalidas = Boolean(form.fechaInicio && form.fechaFin && form.fechaInicio > form.fechaFin);

  useEffect(() => {
    if (!tieneCambios) return;
    const advertir = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', advertir);
    return () => window.removeEventListener('beforeunload', advertir);
  }, [tieneCambios]);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cargaCorrecta) return;
    const umbral = Number(form.umbralReportes);
    const periodo = Number(form.periodoDias);
    const numeroPeriodos = Number(form.numeroPeriodos);
    if (!form.fechaInicio || !form.fechaFin || form.fechaInicio > form.fechaFin || !Number.isInteger(numeroPeriodos) || numeroPeriodos < 1 || numeroPeriodos > 6 || Number(form.periodoActual) < 1 || Number(form.periodoActual) > numeroPeriodos) {
      setFeedback({ tipo: 'error', texto: 'Revisa el periodo y las fechas del calendario académico.' });
      return;
    }
    if (!Number.isInteger(umbral) || umbral < 2 || umbral > 20 || !Number.isInteger(periodo) || periodo < 1 || periodo > 365) {
      setFeedback({ tipo: 'error', texto: 'Revisa los rangos permitidos para las reglas de alerta.' });
      return;
    }
    setGuardando(true);
    setFeedback(null);
    try {
      const todasLasEntradas = [
        ['calendario.fechaInicio', form.fechaInicio],
        ['calendario.fechaFin', form.fechaFin],
        ['calendario.numeroPeriodos', form.numeroPeriodos],
        ['calendario.periodoActual', form.periodoActual],
        ['alertas.habilitadas', form.alertasHabilitadas],
        ['alertas.umbralReportes', form.umbralReportes],
        ['alertas.periodoDias', form.periodoDias],
      ] as const;
      const entradas = todasLasEntradas.filter(([clave, valor]) => valor !== guardada[({
        'calendario.fechaInicio': 'fechaInicio', 'calendario.fechaFin': 'fechaFin', 'calendario.numeroPeriodos': 'numeroPeriodos',
        'calendario.periodoActual': 'periodoActual', 'alertas.habilitadas': 'alertasHabilitadas', 'alertas.umbralReportes': 'umbralReportes', 'alertas.periodoDias': 'periodoDias',
      } as const)[clave]]);
      if (!entradas.length) return;
      const response = await fetch('/api/configuracion', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entradas: entradas.map(([clave, valor]) => ({ clave, valor })) }),
      });
      if (!response.ok) throw new Error(await leerError(response, 'No se pudo guardar la configuración.'));
      setFeedback({ tipo: 'success', texto: 'Configuración guardada y registrada en auditoría.' });
      await cargar();
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo guardar la configuración.' });
    } finally {
      setGuardando(false);
    }
  }

  const fechaActualizacion = ultimaActualizacion ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(parseReportDate(ultimaActualizacion)) : null;
  return <section className="settings-workspace ui-workspace" aria-label="Configuración del sistema">
    <ModuleHeader icon={<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.1A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.1A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.1A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.38.37.72.6 1 .3.3.69.46 1.1.46h.1v4h-.1c-.41 0-.8.16-1.1.46-.23.28-.44.62-.6 1Z"/></svg>} kicker="Administración institucional" title="Configuración del sistema" description="Administra la identidad institucional, el calendario académico y las reglas de seguimiento." action={fechaActualizacion ? <div className="settings-updated"><span>Última actualización</span><strong>{fechaActualizacion}</strong></div> : undefined} />
    {feedback && <p className={`feedback ${feedback.tipo}`} role={feedback.tipo === 'error' ? 'alert' : 'status'}>{feedback.texto}</p>}
    {cargando ? <div className="settings-loading" role="status" aria-label="Cargando configuración">{[1, 2, 3].map((item) => <span key={item}><i/><b/><b/><em/><em/></span>)}</div> : !cargaCorrecta ? <div className="settings-load-error"><span aria-hidden="true">!</span><strong>No pudimos cargar la configuración</strong><p>Comprueba la conexión e intenta nuevamente.</p><button type="button" className="ui-button ui-button--secondary" onClick={() => { setCargando(true); setFeedback(null); void cargar().catch(() => setFeedback({ tipo: 'error', texto: 'No se pudo cargar la configuración. Intenta nuevamente.' })).finally(() => setCargando(false)); }}>Reintentar carga</button></div> : <form className="settings-form" onSubmit={guardar}>
      <section className="settings-card">
        <header className="settings-card-heading"><span>01</span><div><small>Datos generales</small><h3>Identidad institucional</h3><p>Información utilizada por el sistema y los documentos institucionales.</p></div><em>Solo lectura</em></header>
        <div className="settings-fields settings-fields--identity">
          <label><span>Nombre de la institución</span><input value={form.institucion} disabled /></label>
          <label><span>Sede</span><input value={form.sede} disabled /></label>
          <label><span>Código DANE</span><input value={form.codigoDane || 'No registrado'} disabled /><small>Dato institucional de solo lectura.</small></label>
          <label><span>Ciudad o municipio</span><input value={form.ciudad || 'No registrada'} disabled /><small>Dato institucional de solo lectura.</small></label>
        </div>
      </section>
      <section className="settings-card">
        <header className="settings-card-heading"><span>02</span><div><small>Planeación académica</small><h3>Calendario académico</h3><p>Define el año activo, las fechas institucionales y el periodo vigente.</p></div>{!puedeEditarGestion && <em>Solo lectura</em>}</header>
        <div className="settings-fields">
          <label><span>Año lectivo</span><input value={form.anoLectivo} disabled /><small>Se actualiza automáticamente según la fecha de Colombia.</small></label>
          <label><span>Cantidad de periodos</span><input type="number" min="1" max="6" value={form.numeroPeriodos} disabled={guardando || !puedeEditarGestion} onChange={(event) => setForm({ ...form, numeroPeriodos: event.target.value, periodoActual: String(Math.min(Number(form.periodoActual), Number(event.target.value) || 1)) })} required /><small>Permite adaptar el año a 3, 4 u otra cantidad de periodos.</small></label>
          <label><span>Periodo actual</span><select value={form.periodoActual} disabled={guardando || !puedeEditarGestion} onChange={(event) => setForm({ ...form, periodoActual: event.target.value })}>{Array.from({ length: Number(form.numeroPeriodos) || 1 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Periodo {index + 1}</option>)}</select></label>
          <label><span>Inicio del año</span><input type="date" value={form.fechaInicio} disabled={guardando || !puedeEditarGestion} aria-invalid={fechasInvalidas} onChange={(event) => setForm({ ...form, fechaInicio: event.target.value })} required /></label>
          <label><span>Finalización del año</span><input type="date" min={form.fechaInicio} value={form.fechaFin} disabled={guardando || !puedeEditarGestion} aria-invalid={fechasInvalidas} onChange={(event) => setForm({ ...form, fechaFin: event.target.value })} required />{fechasInvalidas && <small className="settings-field-error">Debe ser posterior a la fecha de inicio.</small>}</label>
        </div>
        <div className={`settings-calendar-summary${fechasInvalidas ? ' settings-calendar-summary--error' : ''}`}><span aria-hidden="true">{fechasInvalidas ? '!' : '✓'}</span><div><strong>{fechasInvalidas ? 'Revisa las fechas del calendario' : `${form.anoLectivo} · Periodo ${form.periodoActual} de ${form.numeroPeriodos}`}</strong><small>{fechasInvalidas ? 'La fecha final no puede ser anterior al inicio.' : `Del ${form.fechaInicio || '—'} al ${form.fechaFin || '—'}`}</small></div></div>
      </section>
      <section className="settings-card">
        <header className="settings-card-heading"><span>03</span><div><small>Seguimiento institucional</small><h3>Reglas de alertas</h3><p>Configura cuándo SIGDE debe señalar patrones que requieren revisión.</p></div>{!puedeEditarGestion && <em>Solo lectura</em>}</header>
        <div className="settings-fields">
          <label className="settings-toggle-field"><span>Generación de alertas</span><span className="settings-switch-row"><span><strong>{form.alertasHabilitadas === 'true' ? 'Activada' : 'Pausada'}</strong><small>{form.alertasHabilitadas === 'true' ? 'SIGDE generará alertas nuevas.' : 'No se generarán alertas nuevas.'}</small></span><input type="checkbox" role="switch" aria-label="Activar generación de alertas" checked={form.alertasHabilitadas === 'true'} disabled={guardando || !puedeEditarGestion} onChange={(event) => setForm({ ...form, alertasHabilitadas: String(event.target.checked) })} /></span></label>
          <label><span>Reportes para generar alerta</span><input type="number" min="2" max="20" value={form.umbralReportes} disabled={guardando || !puedeEditarGestion} onChange={(event) => setForm({ ...form, umbralReportes: event.target.value })} required /><small>Entre 2 y 20 reportes.</small></label>
          <label><span>Periodo de evaluación</span><div className="settings-input-suffix"><input type="number" min="1" max="365" value={form.periodoDias} disabled={guardando || !puedeEditarGestion} onChange={(event) => setForm({ ...form, periodoDias: event.target.value })} required /><span>días</span></div><small>Entre 1 y 365 días.</small></label>
        </div>
        <aside className="settings-human-review"><span aria-hidden="true">i</span><div><strong>La valoración siempre es humana</strong><p>Las reglas detectan coincidencias objetivas. SIGDE ofrece información orientativa, pero no toma decisiones sobre estudiantes ni reemplaza el criterio del equipo institucional.</p></div></aside>
      </section>
      <div className={`settings-actions${tieneCambios ? ' settings-actions--pending' : ''}`}><div className="settings-change-summary"><span aria-hidden="true">{tieneCambios ? cambiosPendientes : '✓'}</span><p><strong>{tieneCambios ? `${cambiosPendientes} ${cambiosPendientes === 1 ? 'cambio pendiente' : 'cambios pendientes'}` : 'Configuración actualizada'}</strong><small>{tieneCambios ? 'Revisa la información antes de guardar.' : 'No hay modificaciones sin guardar.'}</small></p></div><div className="settings-action-buttons"><button type="button" className="ui-button ui-button--secondary" disabled={guardando || !tieneCambios} onClick={() => { setForm(guardada); setFeedback(null); }}>Descartar</button><button type="submit" className="ui-button ui-button--primary" disabled={guardando || !tieneCambios || fechasInvalidas}>{guardando ? 'Guardando…' : 'Guardar configuración'}</button></div></div>
    </form>}
  </section>;
}
