'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { calcularFortaleza } from '@/lib/password-strength';

function PasswordField({ id, label, value, onChange, autocomplete, disabled }: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autocomplete: 'current-password' | 'new-password';
  disabled: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const nombreAccesible = id === 'temporal' ? 'contraseña temporal' : id === 'nueva' ? 'nueva contraseña' : 'confirmación de contraseña';
  return <div className="field-group">
    <label htmlFor={id}>{label}</label>
    <div className="password-field">
      <input id={id} type={visible ? 'text' : 'password'} autoComplete={autocomplete} value={value} onChange={(event) => onChange(event.target.value)} required minLength={autocomplete === 'new-password' ? 8 : undefined} maxLength={128} disabled={disabled} />
      <button type="button" className="icon-button" onClick={() => setVisible((current) => !current)} aria-label={`${visible ? 'Ocultar' : 'Mostrar'} ${nombreAccesible}`} aria-controls={id} aria-pressed={visible}>
        {visible ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  </div>;
}

export default function FirstPasswordChange({ nombre }: { nombre: string }) {
  const router = useRouter();
  const { refrescarSesion, cerrarSesion } = useAuth();
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const fortaleza = useMemo(() => nueva ? calcularFortaleza(nueva) : null, [nueva]);

  async function guardar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (nueva !== confirmacion) return setError('Las contraseñas nuevas no coinciden. Revísalas e inténtalo de nuevo.');
    if (nueva.length < 8 || !/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(nueva) || !/[0-9]/.test(nueva)) {
      return setError('La nueva contraseña debe tener al menos 8 caracteres y combinar letras y números.');
    }
    setGuardando(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'cambiarContrasenaTemporal', contrasenaActual: actual, nuevaContrasena: nueva }),
      });
      const data = await response.json().catch(() => ({}));
      if (response.status === 401) {
        await cerrarSesion('Tu sesión expiró. Inicia sesión nuevamente para cambiar la contraseña.');
        return;
      }
      if (!response.ok) throw new Error(data.error || 'No se pudo cambiar la contraseña. Inténtalo nuevamente.');
      setActual(''); setNueva(''); setConfirmacion('');
      await refrescarSesion();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No hay conexión con el servidor. Revisa tu red e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return <main className="first-password-screen">
      <section className="first-password-dialog" aria-labelledby="first-password-title">
        <div className="first-password-badge">Primer ingreso</div>
        <header className="form-header">
          <h1 id="first-password-title">Protege tu cuenta, {nombre.split(' ')[0]}</h1>
          <p>La contraseña que recibiste es temporal. Crea una propia para usar SIGDE.</p>
        </header>
        <form className="auth-form first-password-form" onSubmit={guardar}>
          <PasswordField id="temporal" label="Contraseña temporal" value={actual} onChange={setActual} autocomplete="current-password" disabled={guardando} />
          <PasswordField id="nueva" label="Nueva contraseña" value={nueva} onChange={setNueva} autocomplete="new-password" disabled={guardando} />
          {fortaleza && <div className="password-strength" aria-label={`Fortaleza de contraseña: ${fortaleza.texto}`}><div className="strength-bars" aria-hidden="true">{[1, 2, 3, 4, 5].map((nivel) => <span key={nivel} style={{ backgroundColor: nivel <= fortaleza.nivel ? fortaleza.color : undefined }} />)}</div><p style={{ color: fortaleza.color }}>{fortaleza.texto}</p></div>}
          <PasswordField id="confirmacion" label="Confirma la nueva contraseña" value={confirmacion} onChange={setConfirmacion} autocomplete="new-password" disabled={guardando} />
          <p className="first-password-help">Mínimo 8 caracteres, con letras y números. Una frase larga es más segura.</p>
          {error && <p className="feedback error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={guardando}>{guardando ? 'Guardando...' : 'Cambiar contraseña y continuar'}</button>
        </form>
        <button className="first-password-logout" type="button" disabled={guardando} onClick={() => void cerrarSesion('Sesión cerrada correctamente.')}>Cerrar sesión</button>
      </section>
  </main>;
}

function EyeIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" /></svg>;
}

function EyeOffIcon() {
  return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M8.5 5.6A10.3 10.3 0 0 1 12 5c6.4 0 10 7 10 7a16.4 16.4 0 0 1-3.1 4.1M6.1 6.9C3.5 8.7 2 12 2 12s3.6 7 10 7a10.4 10.4 0 0 0 4.2-.9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}
