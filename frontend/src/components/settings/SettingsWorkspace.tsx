'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

type ConfigRow = { clave: string; valor: string; actualizadoEn: string };
type Feedback = { tipo: 'success' | 'error'; texto: string };
type ConfigForm = { institucion: string; anoLectivo: string; umbralReportes: string; periodoDias: string };

const DEFAULTS: ConfigForm = { institucion: 'Institución educativa', anoLectivo: String(new Date().getFullYear()), umbralReportes: '3', periodoDias: '30' };

async function leerError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === 'string' ? body.error : fallback;
}

export default function SettingsWorkspace() {
  const [form, setForm] = useState<ConfigForm>(DEFAULTS);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const cargar = useCallback(async () => {
    const response = await fetch('/api/configuracion', { cache: 'no-store' });
    if (!response.ok) throw new Error(await leerError(response, 'No se pudo cargar la configuración.'));
    const rows = await response.json() as ConfigRow[];
    const valores = new Map(rows.map((row) => [row.clave, row.valor]));
    setForm({
      institucion: valores.get('institucion.nombre') || DEFAULTS.institucion,
      anoLectivo: valores.get('institucion.anoLectivo') || DEFAULTS.anoLectivo,
      umbralReportes: valores.get('alertas.umbralReportes') || DEFAULTS.umbralReportes,
      periodoDias: valores.get('alertas.periodoDias') || DEFAULTS.periodoDias,
    });
    const fecha = rows.map((row) => new Date(row.actualizadoEn)).filter((date) => !Number.isNaN(date.getTime())).sort((a, b) => b.getTime() - a.getTime())[0];
    setUltimaActualizacion(fecha?.toISOString() ?? null);
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

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const umbral = Number(form.umbralReportes);
    const periodo = Number(form.periodoDias);
    if (!Number.isInteger(umbral) || umbral < 2 || umbral > 20 || !Number.isInteger(periodo) || periodo < 1 || periodo > 365) {
      setFeedback({ tipo: 'error', texto: 'Revisa los rangos permitidos para las reglas de alerta.' });
      return;
    }
    setGuardando(true);
    setFeedback(null);
    try {
      const entradas = [
        ['institucion.nombre', form.institucion],
        ['institucion.anoLectivo', form.anoLectivo],
        ['alertas.umbralReportes', form.umbralReportes],
        ['alertas.periodoDias', form.periodoDias],
      ] as const;
      const responses = await Promise.all(entradas.map(([clave, valor]) => fetch('/api/configuracion', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clave, valor }),
      })));
      const fallida = responses.find((response) => !response.ok);
      if (fallida) throw new Error(await leerError(fallida, 'No se pudo guardar toda la configuración.'));
      setFeedback({ tipo: 'success', texto: 'Configuración guardada y registrada en auditoría.' });
      await cargar();
    } catch (error) {
      setFeedback({ tipo: 'error', texto: error instanceof Error ? error.message : 'No se pudo guardar la configuración.' });
    } finally {
      setGuardando(false);
    }
  }

  return <section className="workspace-panel settings-workspace">
    <header className="module-page-heading"><div className="module-title"><h2>Configuración del sistema</h2><p>Ajusta los datos institucionales y las reglas automáticas de seguimiento.</p></div>{ultimaActualizacion && <span className="settings-updated">Actualizado {new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(ultimaActualizacion))}</span>}</header>
    {feedback && <p className={`feedback ${feedback.tipo}`} role="status">{feedback.texto}</p>}
    {cargando ? <p className="module-loading">Cargando configuración...</p> : <form className="settings-form" onSubmit={guardar}>
      <section className="settings-card"><div className="settings-card-heading"><span>01</span><div><h3>Identidad institucional</h3><p>Información general visible para el equipo de trabajo.</p></div></div><div className="settings-fields"><label><span>Nombre de la institución</span><input value={form.institucion} minLength={3} maxLength={120} onChange={(event) => setForm({ ...form, institucion: event.target.value })} required /></label><label><span>Año lectivo</span><input inputMode="numeric" pattern="[0-9]{4}" value={form.anoLectivo} onChange={(event) => setForm({ ...form, anoLectivo: event.target.value })} required /></label></div></section>
      <section className="settings-card"><div className="settings-card-heading"><span>02</span><div><h3>Reglas de alertas</h3><p>SIGDE aplica umbrales verificables; no utiliza modelos de inteligencia artificial.</p></div></div><div className="settings-fields"><label><span>Reportes para generar alerta</span><input type="number" min="2" max="20" value={form.umbralReportes} onChange={(event) => setForm({ ...form, umbralReportes: event.target.value })} required /><small>Entre 2 y 20 reportes.</small></label><label><span>Periodo de evaluación</span><div className="settings-input-suffix"><input type="number" min="1" max="365" value={form.periodoDias} onChange={(event) => setForm({ ...form, periodoDias: event.target.value })} required /><span>días</span></div><small>Entre 1 y 365 días.</small></label></div></section>
      <div className="settings-actions"><p>Los cambios afectan las alertas que se generen a partir de ahora.</p><button type="submit" className="module-primary-action" disabled={guardando}>{guardando ? 'Guardando...' : 'Guardar configuración'}</button></div>
    </form>}
  </section>;
}
