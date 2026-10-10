'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { parseReportDate } from '@/lib/report-dates';

type ConfigRow = { clave: string; valor: string; actualizadoEn: string };
type Feedback = { tipo: 'success' | 'error'; texto: string };
type GmailStatus = {
  configured: boolean;
  connected: boolean;
  account: string | null;
  importQuery: string;
  allowedSenders?: string[];
  connectedAt?: string | null;
  lastSyncAt?: string | null;
  lastError?: string | null;
};
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

const ANO_ACTUAL = new Date().getFullYear();
const DEFAULTS: ConfigForm = {
  institucion: 'Institución educativa', sede: 'Principal', codigoDane: '', ciudad: '',
  anoLectivo: String(ANO_ACTUAL), fechaInicio: `${ANO_ACTUAL}-01-01`, fechaFin: `${ANO_ACTUAL}-12-31`, numeroPeriodos: '4', periodoActual: '1',
  alertasHabilitadas: 'true', umbralReportes: '3', periodoDias: '30',
};

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

export default function SettingsWorkspace({ role }: { role: 'admin' | 'coordinador' | 'docente' | 'portero' }) {
  const puedeEditarIdentidad = role === 'admin';
  const puedeEditarGestion = role === 'admin' || role === 'coordinador';
  const [form, setForm] = useState<ConfigForm>(DEFAULTS);
  const [guardada, setGuardada] = useState<ConfigForm>(DEFAULTS);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [cargaCorrecta, setCargaCorrecta] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [gmail, setGmail] = useState<GmailStatus | null>(null);
  const [gmailBusy, setGmailBusy] = useState(false);

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
      anoLectivo: valores.get('institucion.anoLectivo') || DEFAULTS.anoLectivo,
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

  const cargarGmail = useCallback(async () => {
    if (!puedeEditarGestion) return;
    const response = await fetch('/api/integraciones/gmail', { cache: 'no-store' });
    if (response.ok) setGmail(await response.json() as GmailStatus);
  }, [puedeEditarGestion]);

  useEffect(() => {
    let activa = true;
    const timer = window.setTimeout(() => {
      void cargar().catch((error) => {
        if (activa) setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo abrir la configuración.' });
      }).finally(() => { if (activa) setCargando(false); });
    }, 0);
    return () => { activa = false; window.clearTimeout(timer); };
  }, [cargar]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void cargarGmail(); }, 0);
    return () => window.clearTimeout(timer);
  }, [cargarGmail]);

  async function conectarGmail() {
    setGmailBusy(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/integraciones/gmail', { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.url) throw new Error(body?.error || 'No se pudo iniciar la conexión con Google.');
      window.location.assign(body.url);
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo conectar Gmail.' });
      setGmailBusy(false);
    }
  }

  async function sincronizarGmail() {
    setGmailBusy(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/integraciones/gmail/sync', { method: 'POST' });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error || 'No se pudo sincronizar Gmail.');
      setFeedback({ tipo: 'success', texto: `Gmail sincronizado: ${body.communications} comunicaciones, ${body.events} eventos y ${body.schedules} horarios nuevos.` });
      await cargarGmail();
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo sincronizar Gmail.' });
    } finally {
      setGmailBusy(false);
    }
  }

  async function desconectarGmail() {
    if (!window.confirm('¿Desconectar Gmail institucional de SIGDE?')) return;
    setGmailBusy(true);
    setFeedback(null);
    try {
      const response = await fetch('/api/integraciones/gmail', { method: 'DELETE' });
      if (!response.ok) throw new Error('No se pudo desconectar Gmail.');
      setFeedback({ tipo: 'success', texto: 'La cuenta de Gmail fue desconectada.' });
      await cargarGmail();
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo desconectar Gmail.' });
    } finally {
      setGmailBusy(false);
    }
  }

  const tieneCambios = useMemo(() => Object.keys(form).some((key) => form[key as keyof ConfigForm] !== guardada[key as keyof ConfigForm]), [form, guardada]);

  useEffect(() => {
    if (!tieneCambios) return;
    const advertir = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', advertir);
    return () => window.removeEventListener('beforeunload', advertir);
  }, [tieneCambios]);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cargaCorrecta) return;
    const institucion = form.institucion.trim();
    const sede = form.sede.trim();
    const ciudad = form.ciudad.trim();
    const umbral = Number(form.umbralReportes);
    const periodo = Number(form.periodoDias);
    const anoLectivo = Number(form.anoLectivo);
    const numeroPeriodos = Number(form.numeroPeriodos);
    if (institucion.length < 3 || institucion.length > 120 || sede.length < 2 || sede.length > 80 || (ciudad.length > 0 && (ciudad.length < 2 || ciudad.length > 80)) || (form.codigoDane.length > 0 && !/^\d{12}$/.test(form.codigoDane))) {
      setFeedback({ tipo: 'error', texto: 'Revisa los datos de identificación institucional.' });
      return;
    }
    if (!/^\d{4}$/.test(form.anoLectivo) || anoLectivo < 2000 || anoLectivo > 2100 || !form.fechaInicio || !form.fechaFin || form.fechaInicio > form.fechaFin || !Number.isInteger(numeroPeriodos) || numeroPeriodos < 1 || numeroPeriodos > 6 || Number(form.periodoActual) < 1 || Number(form.periodoActual) > numeroPeriodos) {
      setFeedback({ tipo: 'error', texto: 'Revisa el año, el periodo y las fechas del calendario académico.' });
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
        ['institucion.nombre', institucion],
        ['institucion.sede', sede],
        ['institucion.codigoDane', form.codigoDane],
        ['institucion.ciudad', ciudad],
        ['institucion.anoLectivo', form.anoLectivo],
        ['calendario.fechaInicio', form.fechaInicio],
        ['calendario.fechaFin', form.fechaFin],
        ['calendario.numeroPeriodos', form.numeroPeriodos],
        ['calendario.periodoActual', form.periodoActual],
        ['alertas.habilitadas', form.alertasHabilitadas],
        ['alertas.umbralReportes', form.umbralReportes],
        ['alertas.periodoDias', form.periodoDias],
      ] as const;
      const clavesIdentidad = new Set(['institucion.nombre', 'institucion.sede', 'institucion.codigoDane', 'institucion.ciudad']);
      const entradas = todasLasEntradas.filter(([clave, valor]) => valor !== guardada[({
        'institucion.nombre': 'institucion', 'institucion.sede': 'sede', 'institucion.codigoDane': 'codigoDane', 'institucion.ciudad': 'ciudad',
        'institucion.anoLectivo': 'anoLectivo', 'calendario.fechaInicio': 'fechaInicio', 'calendario.fechaFin': 'fechaFin', 'calendario.numeroPeriodos': 'numeroPeriodos',
        'calendario.periodoActual': 'periodoActual', 'alertas.habilitadas': 'alertasHabilitadas', 'alertas.umbralReportes': 'umbralReportes', 'alertas.periodoDias': 'periodoDias',
      } as const)[clave]] && (puedeEditarIdentidad || !clavesIdentidad.has(clave)));
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

  return <section className="workspace-panel settings-workspace">
    <header className="module-page-heading"><div className="module-title"><h2>Configuración del sistema</h2><p>Ajusta los datos institucionales y las reglas automáticas de seguimiento.</p></div>{ultimaActualizacion && <span className="settings-updated">Actualizado {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(parseReportDate(ultimaActualizacion))}</span>}</header>
    {feedback && <p className={`feedback ${feedback.tipo}`} role={feedback.tipo === 'error' ? 'alert' : 'status'}>{feedback.texto}</p>}
    {cargando ? <p className="module-loading">Cargando configuración...</p> : !cargaCorrecta ? <button type="button" className="secondary-button" onClick={() => { setCargando(true); void cargar().catch(() => setFeedback({ tipo: 'error', texto: 'No se pudo cargar la configuración. Intenta nuevamente.' })).finally(() => setCargando(false)); }}>Reintentar carga</button> : <form className="settings-form" onSubmit={guardar}>
      <section className="settings-card">
        <div className="settings-card-heading"><span>01</span><div><h3>Identidad institucional</h3><p>Datos utilizados en el sistema y en los documentos institucionales.</p></div></div>
        <div className="settings-fields">
          <label><span>Nombre de la institución</span><input value={form.institucion} minLength={3} maxLength={120} disabled={guardando || !puedeEditarIdentidad} onChange={(event) => setForm({ ...form, institucion: event.target.value })} required /></label>
          <label><span>Sede</span><input value={form.sede} minLength={2} maxLength={80} disabled={guardando || !puedeEditarIdentidad} onChange={(event) => setForm({ ...form, sede: event.target.value })} placeholder="Principal" required /></label>
          <label><span>Código DANE</span><input inputMode="numeric" pattern="[0-9]{12}" minLength={12} maxLength={12} value={form.codigoDane} disabled={guardando || !puedeEditarIdentidad} onChange={(event) => setForm({ ...form, codigoDane: event.target.value.replace(/\D/g, '').slice(0, 12) })} /><small>{puedeEditarIdentidad ? 'Opcional, 12 dígitos.' : 'Solo el administrador puede modificarlo.'}</small></label>
          <label><span>Ciudad o municipio</span><input value={form.ciudad} minLength={2} maxLength={80} disabled={guardando || !puedeEditarIdentidad} onChange={(event) => setForm({ ...form, ciudad: event.target.value })} /><small>{puedeEditarIdentidad ? 'Opcional.' : 'Identidad institucional de solo lectura.'}</small></label>
        </div>
      </section>
      <section className="settings-card">
        <div className="settings-card-heading"><span>02</span><div><h3>Calendario académico</h3><p>Define el año activo, sus fechas y el periodo institucional vigente.</p></div></div>
        <div className="settings-fields">
          <label><span>Año lectivo</span><input inputMode="numeric" pattern="[0-9]{4}" minLength={4} maxLength={4} value={form.anoLectivo} disabled={guardando} onChange={(event) => setForm({ ...form, anoLectivo: event.target.value.replace(/\D/g, '').slice(0, 4) })} required /><small>Entre 2000 y 2100.</small></label>
          <label><span>Cantidad de periodos</span><input type="number" min="1" max="6" value={form.numeroPeriodos} disabled={guardando || !puedeEditarGestion} onChange={(event) => setForm({ ...form, numeroPeriodos: event.target.value, periodoActual: String(Math.min(Number(form.periodoActual), Number(event.target.value) || 1)) })} required /><small>Permite adaptar el año a 3, 4 u otra cantidad de periodos.</small></label>
          <label><span>Periodo actual</span><select value={form.periodoActual} disabled={guardando || !puedeEditarGestion} onChange={(event) => setForm({ ...form, periodoActual: event.target.value })}>{Array.from({ length: Number(form.numeroPeriodos) || 1 }, (_, index) => <option key={index + 1} value={String(index + 1)}>Periodo {index + 1}</option>)}</select></label>
          <label><span>Inicio del año</span><input type="date" value={form.fechaInicio} disabled={guardando} onChange={(event) => setForm({ ...form, fechaInicio: event.target.value })} required /></label>
          <label><span>Finalización del año</span><input type="date" min={form.fechaInicio} value={form.fechaFin} disabled={guardando} onChange={(event) => setForm({ ...form, fechaFin: event.target.value })} required /></label>
        </div>
      </section>
      <section className="settings-card">
        <div className="settings-card-heading"><span>03</span><div><h3>Agente de análisis y alertas</h3><p>Las reglas detectan patrones objetivos y el agente genera un análisis orientativo para cada alerta, siempre con revisión humana.</p></div></div>
        <div className="settings-fields">
          <label className="settings-toggle-field"><span>Motor de alertas</span><select value={form.alertasHabilitadas} disabled={guardando} onChange={(event) => setForm({ ...form, alertasHabilitadas: event.target.value })}><option value="true">Activado</option><option value="false">Pausado</option></select><small>Al pausarlo no se generan alertas nuevas.</small></label>
          <label><span>Reportes para generar alerta</span><input type="number" min="2" max="20" value={form.umbralReportes} disabled={guardando} onChange={(event) => setForm({ ...form, umbralReportes: event.target.value })} required /><small>Entre 2 y 20 reportes.</small></label>
          <label><span>Periodo de evaluación</span><div className="settings-input-suffix"><input type="number" min="1" max="365" value={form.periodoDias} disabled={guardando} onChange={(event) => setForm({ ...form, periodoDias: event.target.value })} required /><span>días</span></div><small>Entre 1 y 365 días.</small></label>
        </div>
      </section>
      {puedeEditarGestion && <section className="settings-card">
        <div className="settings-card-heading"><span>04</span><div><h3>Correo institucional</h3><p>Clasifica correos autorizados: actualiza horarios, agenda actividades y publica comunicaciones.</p></div></div>
        <div className="settings-fields">
          <label><span>Cuenta autorizada</span><input value={gmail?.account || 'Sin configurar'} disabled /><small>El acceso es de solo lectura y SIGDE nunca recibe la contraseña.</small></label>
          <label><span>Estado</span><input value={!gmail ? 'Consultando…' : !gmail.configured ? 'Faltan credenciales de Google' : gmail.connected ? 'Conectada' : 'Pendiente de autorización'} disabled /><small>{gmail?.lastSyncAt ? `Última sincronización: ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(parseReportDate(gmail.lastSyncAt))}` : `Filtro: ${gmail?.importQuery || 'label:SIGDE'}`}</small></label>
          <label><span>Remitentes autorizados</span><textarea value={(gmail?.allowedSenders || []).join('\n') || 'Sin configurar'} disabled rows={2} /><small>Cualquier otro remitente será ignorado.</small></label>
        </div>
        {gmail?.lastError && <p className="feedback error" role="alert">Último error: {gmail.lastError}</p>}
        <div className="settings-action-buttons">
          {!gmail?.connected && <button type="button" className="module-primary-action" disabled={gmailBusy || !gmail?.configured} onClick={() => void conectarGmail()}>{gmailBusy ? 'Abriendo Google…' : 'Conectar con Google'}</button>}
          {gmail?.connected && <><button type="button" className="module-primary-action" disabled={gmailBusy} onClick={() => void sincronizarGmail()}>{gmailBusy ? 'Sincronizando…' : 'Sincronizar ahora'}</button><button type="button" className="module-secondary-action" disabled={gmailBusy} onClick={() => void desconectarGmail()}>Desconectar</button></>}
        </div>
      </section>}
      <div className="settings-actions"><p>{tieneCambios ? 'Tienes cambios pendientes. Las reglas nuevas se aplicarán a las alertas futuras.' : 'La configuración está actualizada.'}</p><div className="settings-action-buttons"><button type="button" className="module-secondary-action" disabled={guardando || !tieneCambios} onClick={() => { setForm(guardada); setFeedback(null); }}>Descartar cambios</button><button type="submit" className="module-primary-action" disabled={guardando || !tieneCambios}>{guardando ? 'Guardando...' : 'Guardar configuración'}</button></div></div>
    </form>}
  </section>;
}
