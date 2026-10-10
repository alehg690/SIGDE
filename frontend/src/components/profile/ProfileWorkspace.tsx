'use client';

import { FormEvent, useEffect, useState } from 'react';

type ProfileUser = { nombre: string; correo: string; rol: string };
type Feedback = { tipo: 'success' | 'error'; texto: string };

async function leerRespuesta(response: Response, fallback: string) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof data.error === 'string' ? data.error : fallback);
  return data;
}

export default function ProfileWorkspace({ usuario, onUpdated }: { usuario: ProfileUser; onUpdated: () => void }) {
  const [nombre, setNombre] = useState(usuario.nombre);
  const [guardandoNombre, setGuardandoNombre] = useState(false);
  const [feedbackNombre, setFeedbackNombre] = useState<Feedback | null>(null);
  const [densidad, setDensidad] = useState<'comoda' | 'compacta'>('comoda');
  const [reducirMovimiento, setReducirMovimiento] = useState(false);
  const [preferenciasGuardadas, setPreferenciasGuardadas] = useState({ densidad: 'comoda' as 'comoda' | 'compacta', reducirMovimiento: false });
  const [feedbackPreferencias, setFeedbackPreferencias] = useState<Feedback | null>(null);
  const [cerrandoSesiones, setCerrandoSesiones] = useState(false);
  const [feedbackSesiones, setFeedbackSesiones] = useState<Feedback | null>(null);
  const nombreLimpio = nombre.trim();
  const nombreCambio = nombreLimpio !== usuario.nombre;
  const preferenciasCambio = densidad !== preferenciasGuardadas.densidad || reducirMovimiento !== preferenciasGuardadas.reducirMovimiento;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const densidadGuardada = localStorage.getItem('sigde_ui_density') === 'compacta' ? 'compacta' : 'comoda';
      const movimientoGuardado = localStorage.getItem('sigde_reduce_motion') === 'true';
      setDensidad(densidadGuardada);
      setReducirMovimiento(movimientoGuardado);
      setPreferenciasGuardadas({ densidad: densidadGuardada, reducirMovimiento: movimientoGuardado });
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function guardarNombre(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nombreLimpio.length < 3 || nombreLimpio.length > 120) {
      setFeedbackNombre({ tipo: 'error', texto: 'El nombre debe tener entre 3 y 120 caracteres.' });
      return;
    }
    setGuardandoNombre(true);
    setFeedbackNombre(null);
    try {
      const response = await fetch('/api/perfil', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nombre: nombreLimpio }) });
      const data = await leerRespuesta(response, 'No se pudo actualizar el perfil.');
      setNombre(data.nombre);
      setFeedbackNombre({ tipo: 'success', texto: 'Tu nombre se actualizó correctamente.' });
      onUpdated();
    } catch (error) {
      setFeedbackNombre({ tipo: 'error', texto: error instanceof Error ? error.message : 'No hay conexión con el servidor.' });
    } finally {
      setGuardandoNombre(false);
    }
  }

  function guardarPreferencias(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    localStorage.setItem('sigde_ui_density', densidad);
    localStorage.setItem('sigde_reduce_motion', String(reducirMovimiento));
    setPreferenciasGuardadas({ densidad, reducirMovimiento });
    setFeedbackPreferencias({ tipo: 'success', texto: 'Las preferencias se guardaron en este dispositivo.' });
    window.dispatchEvent(new CustomEvent('sigde-preferences-change', { detail: { densidad, reducirMovimiento } }));
  }

  async function cerrarSesiones() {
    setCerrandoSesiones(true);
    setFeedbackSesiones(null);
    try {
      const response = await fetch('/api/perfil', { method: 'POST' });
      const data = await leerRespuesta(response, 'No se pudieron cerrar las demás sesiones.');
      setFeedbackSesiones({ tipo: 'success', texto: data.mensaje || 'Las demás sesiones se cerraron correctamente.' });
    } catch (error) {
      setFeedbackSesiones({ tipo: 'error', texto: error instanceof Error ? error.message : 'No hay conexión con el servidor.' });
    } finally {
      setCerrandoSesiones(false);
    }
  }

  const rol = usuario.rol === 'Porteria' ? 'Portería' : usuario.rol;
  return <section className="workspace-panel settings-workspace profile-workspace">
    <header className="module-page-heading"><div className="module-title"><h2>Mi perfil</h2><p>Administra tus datos personales y preferencias de interfaz.</p></div><span className="profile-status"><i aria-hidden="true" /> Cuenta activa</span></header>
    <div className="profile-summary" aria-label="Resumen de la cuenta"><span className="profile-summary-avatar" aria-hidden="true">{usuario.nombre.slice(0, 1).toUpperCase()}</span><div><strong>{usuario.nombre}</strong><span>{usuario.correo}</span></div><span className="profile-role-badge">{rol}</span></div>

    <form className="settings-form profile-section-form" onSubmit={guardarNombre}>
      <section className="settings-card"><div className="settings-card-heading"><span>01</span><div><h3>Información personal</h3><p>El nombre se muestra en registros, auditoría y acciones realizadas.</p></div></div><div className="profile-card-content">
        {feedbackNombre && <p className={`feedback ${feedbackNombre.tipo}`} role={feedbackNombre.tipo === 'error' ? 'alert' : 'status'}>{feedbackNombre.texto}</p>}
        <div className="settings-fields profile-name-fields"><label><span>Nombre completo</span><input required minLength={3} maxLength={120} value={nombre} disabled={guardandoNombre} autoComplete="name" onChange={(event) => setNombre(event.target.value)} /></label></div>
        <dl className="profile-list"><div><dt>Correo institucional</dt><dd>{usuario.correo}</dd></div><div><dt>Rol asignado</dt><dd>{rol}</dd></div></dl>
        <p className="profile-help">El correo y el rol solo pueden ser modificados desde Usuarios por una cuenta autorizada.</p>
        <div className="profile-inline-actions"><button type="button" className="module-secondary-action" disabled={guardandoNombre || !nombreCambio} onClick={() => { setNombre(usuario.nombre); setFeedbackNombre(null); }}>Descartar</button><button type="submit" className="module-primary-action" disabled={guardandoNombre || !nombreCambio}>{guardandoNombre ? 'Guardando...' : 'Guardar información'}</button></div>
      </div></section>
    </form>

    <form className="settings-form profile-section-form" onSubmit={guardarPreferencias}>
      <section className="settings-card"><div className="settings-card-heading"><span>02</span><div><h3>Preferencias de interfaz</h3><p>Personaliza la cantidad de información visible y las animaciones en este dispositivo.</p></div></div><div className="profile-card-content">
        {feedbackPreferencias && <p className={`feedback ${feedbackPreferencias.tipo}`} role="status">{feedbackPreferencias.texto}</p>}
        <div className="profile-preference-grid">
          <label><span>Densidad de contenido</span><select value={densidad} onChange={(event) => { setDensidad(event.target.value as 'comoda' | 'compacta'); setFeedbackPreferencias(null); }}><option value="comoda">Cómoda</option><option value="compacta">Compacta</option></select><small>La vista compacta reduce espacios para mostrar más información.</small></label>
          <label className="profile-check-option"><input type="checkbox" checked={reducirMovimiento} onChange={(event) => { setReducirMovimiento(event.target.checked); setFeedbackPreferencias(null); }} /><span><strong>Reducir movimiento</strong><small>Desactiva transiciones y animaciones no esenciales.</small></span></label>
        </div>
        <div className="profile-inline-actions"><button type="button" className="module-secondary-action" disabled={!preferenciasCambio} onClick={() => { setDensidad(preferenciasGuardadas.densidad); setReducirMovimiento(preferenciasGuardadas.reducirMovimiento); setFeedbackPreferencias(null); }}>Descartar</button><button type="submit" className="module-primary-action" disabled={!preferenciasCambio}>Guardar preferencias</button></div>
      </div></section>
    </form>

    <section className="settings-form profile-section-form" aria-labelledby="profile-sessions-title">
      <div className="settings-card"><div className="settings-card-heading"><span>03</span><div><h3 id="profile-sessions-title">Sesiones de la cuenta</h3><p>Protege tu cuenta si iniciaste sesión en un equipo que ya no utilizas.</p></div></div><div className="profile-card-content">
        {feedbackSesiones && <p className={`feedback ${feedbackSesiones.tipo}`} role={feedbackSesiones.tipo === 'error' ? 'alert' : 'status'}>{feedbackSesiones.texto}</p>}
        <div className="profile-session-row"><div><strong>Sesión actual protegida</strong><span>Las demás sesiones perderán acceso y deberán autenticarse otra vez.</span></div><button type="button" className="module-secondary-action profile-session-button" disabled={cerrandoSesiones} onClick={() => void cerrarSesiones()}>{cerrandoSesiones ? 'Cerrando...' : 'Cerrar las demás sesiones'}</button></div>
      </div></div>
    </section>
  </section>;
}
