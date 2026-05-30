'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent, useMemo, useState, useSyncExternalStore } from 'react';
import LoginPanel from '@/features/auth/components/LoginPanel';
import type { Vista } from '@/features/auth/types';

type ApiResponse<T = unknown> = {
  error?: string;
  mensaje?: string;
  usuario?: T;
};

type Fortaleza = {
  nivel: number;
  texto: string;
  color: string;
};

const EMAIL_STORAGE_KEY = 'sigde_correo';

function subscribeCorreoGuardado(callback: () => void) {
  window.addEventListener('storage', callback);
  return () => window.removeEventListener('storage', callback);
}

function getCorreoGuardado() {
  return localStorage.getItem(EMAIL_STORAGE_KEY) ?? '';
}

function calcularFortaleza(pass: string): Fortaleza {
  let puntos = 0;
  if (pass.length >= 8) puntos++;
  if (pass.length >= 12) puntos++;
  if (/[A-ZÁÉÍÓÚÑ]/.test(pass)) puntos++;
  if (/[0-9]/.test(pass)) puntos++;
  if (/[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]/.test(pass)) puntos++;

  if (puntos <= 1) return { nivel: 1, texto: 'Muy débil', color: '#e53e3e' };
  if (puntos === 2) return { nivel: 2, texto: 'Débil', color: '#dd6b20' };
  if (puntos === 3) return { nivel: 3, texto: 'Aceptable', color: '#d69e2e' };
  if (puntos === 4) return { nivel: 4, texto: 'Fuerte', color: '#38a169' };
  return { nivel: 5, texto: 'Muy fuerte', color: '#2f855a' };
}

async function leerRespuesta<T>(res: Response): Promise<ApiResponse<T>> {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export default function LoginExperience() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>('login');
  const correoGuardado = useSyncExternalStore(subscribeCorreoGuardado, getCorreoGuardado, () => '');
  const [correoManual, setCorreoManual] = useState<string | null>(null);
  const [contrasena, setContrasena] = useState('');
  const [correoRecuperar, setCorreoRecuperar] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [recordarManual, setRecordarManual] = useState<boolean | null>(null);

  const correo = correoManual ?? correoGuardado;
  const recordarUsuario = recordarManual ?? Boolean(correoGuardado);

  const fortaleza = useMemo(
    () => (nuevaContrasena ? calcularFortaleza(nuevaContrasena) : null),
    [nuevaContrasena]
  );

  function resetearMensajes() {
    setError('');
    setMensaje('');
  }

  function cambiarVista(siguiente: Vista) {
    resetearMensajes();
    setVista(siguiente);
  }

  async function handleLogin(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    resetearMensajes();

    const correoLimpio = correo.trim().toLowerCase();
    if (!correoLimpio || !contrasena) {
      setError('Completa tu correo y contraseña para continuar.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'login',
          correo: correoLimpio,
          contrasena,
        }),
      });
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setContrasena('');
        setError(data.error || 'No pudimos iniciar sesión. Intenta nuevamente.');
        return;
      }

      if (recordarUsuario) {
        localStorage.setItem(EMAIL_STORAGE_KEY, correoLimpio);
      } else {
        localStorage.removeItem(EMAIL_STORAGE_KEY);
      }

      router.replace('/dashboard');
    } catch {
      setError('No hay conexión con el servidor. Revisa tu red e intenta otra vez.');
    } finally {
      setCargando(false);
    }
  }

  async function handleRecuperar(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    resetearMensajes();

    const correoLimpio = correoRecuperar.trim().toLowerCase();
    if (!correoLimpio) {
      setError('Ingresa tu correo institucional.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'recuperar', correo: correoLimpio }),
      });
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || 'No pudimos enviar el código.');
        return;
      }

      setCorreoRecuperar(correoLimpio);
      setMensaje(data.mensaje || 'Código enviado a tu correo.');
      setVista('codigo');
    } catch {
      setError('No hay conexión con el servidor. Intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  }

  async function handleVerificarCodigo(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    resetearMensajes();

    if (codigo.length !== 6) {
      setError('Ingresa el código de 6 dígitos.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'verificarCodigo',
          correo: correoRecuperar,
          codigo,
        }),
      });
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || 'Código incorrecto o expirado.');
        return;
      }

      setVista('nueva-contrasena');
    } catch {
      setError('No hay conexión con el servidor. Intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  }

  async function handleCambiarContrasena(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    resetearMensajes();

    if (nuevaContrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setCargando(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accion: 'cambiarContrasena',
          correo: correoRecuperar,
          codigo,
          nuevaContrasena,
        }),
      });
      const data = await leerRespuesta(res);

      if (!res.ok) {
        setError(data.error || 'No pudimos actualizar la contraseña.');
        return;
      }

      setMensaje('Contraseña actualizada. Ya puedes iniciar sesión.');
      setCodigo('');
      setNuevaContrasena('');
      setConfirmarContrasena('');
      setTimeout(() => cambiarVista('login'), 1600);
    } catch {
      setError('No hay conexión con el servidor. Intenta nuevamente.');
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="login-shell">
      <LoginPanel />
      <section className="login-form-panel" aria-live="polite">
        <div className="login-card">
          <MobileLogo />

          {vista === 'login' && (
            <form className="auth-form" onSubmit={handleLogin}>
              <Header title="Iniciar sesión" subtitle="Ingresa tus credenciales para continuar" />

              <Field
                id="correo"
                label="Correo electrónico"
                type="email"
                autoComplete="email"
                placeholder="Maestro@gmail.com"
                value={correo}
                onChange={setCorreoManual}
              />

              <div className="field-group">
                <label htmlFor="contrasena">Contraseña</label>
                <div className="password-field">
                  <input
                    id="contrasena"
                    type={mostrarContrasena ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Tu contraseña"
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setMostrarContrasena((actual) => !actual)}
                    aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {mostrarContrasena ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              <div className="form-row">
                <label className="checkbox-label" htmlFor="recordar">
                  <input
                    id="recordar"
                    type="checkbox"
                    checked={recordarUsuario}
                    onChange={(event) => setRecordarManual(event.target.checked)}
                  />
                  <span>Recordar usuario</span>
                </label>
              </div>

              <Feedback error={error} mensaje={mensaje} />

              <button className="primary-button" type="submit" disabled={cargando}>
                {cargando ? 'Verificando...' : 'Ingresar al sistema'}
              </button>

              <button
                className="link-button"
                type="button"
                onClick={() => {
                  setCorreoRecuperar(correo.trim().toLowerCase());
                  cambiarVista('recuperar');
                }}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          )}

          {vista === 'recuperar' && (
            <form className="auth-form" onSubmit={handleRecuperar}>
              <Header
                title="Recuperar contraseña"
                subtitle="Te enviaremos un código de verificación a tu correo institucional."
              />

              <Field
                id="correo-recuperar"
                label="Correo"
                type="email"
                autoComplete="email"
                placeholder="Maestro@gmail.com"
                value={correoRecuperar}
                onChange={setCorreoRecuperar}
              />

              <Feedback error={error} mensaje={mensaje} />

              <button className="primary-button" type="submit" disabled={cargando}>
                {cargando ? 'Enviando...' : 'Enviar código'}
              </button>

              <button className="link-button muted" type="button" onClick={() => cambiarVista('login')}>
                Volver al inicio de sesión
              </button>
            </form>
          )}

          {vista === 'codigo' && (
            <form className="auth-form" onSubmit={handleVerificarCodigo}>
              <Header
                title="Verificar código"
                subtitle="Ingresa los 6 dígitos que enviamos a tu correo."
              />

              <div className="field-group">
                <label htmlFor="codigo">Código</label>
                <input
                  id="codigo"
                  className="code-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000000"
                  value={codigo}
                  maxLength={6}
                  onChange={(event) => setCodigo(event.target.value.replace(/\D/g, ''))}
                />
              </div>

              <Feedback error={error} mensaje={mensaje} />

              <button className="primary-button" type="submit" disabled={cargando || codigo.length !== 6}>
                {cargando ? 'Verificando...' : 'Verificar código'}
              </button>

              <button className="link-button muted" type="button" onClick={() => cambiarVista('recuperar')}>
                Reenviar código
              </button>
            </form>
          )}

          {vista === 'nueva-contrasena' && (
            <form className="auth-form" onSubmit={handleCambiarContrasena}>
              <Header title="Nueva contraseña" subtitle="Crea una contraseña segura para tu cuenta." />

              <Field
                id="nueva-contrasena"
                label="Nueva contraseña"
                type="password"
                autoComplete="new-password"
                placeholder="Mínimo 8 caracteres"
                value={nuevaContrasena}
                onChange={setNuevaContrasena}
              />

              {fortaleza && <PasswordStrength fortaleza={fortaleza} />}

              <Field
                id="confirmar-contrasena"
                label="Confirmar contraseña"
                type="password"
                autoComplete="new-password"
                placeholder="Repite tu contraseña"
                value={confirmarContrasena}
                onChange={setConfirmarContrasena}
              />

              <Feedback error={error} mensaje={mensaje} />

              <button
                className="primary-button"
                type="submit"
                disabled={cargando || nuevaContrasena.length < 8 || !confirmarContrasena}
              >
                {cargando ? 'Guardando...' : 'Guardar contraseña'}
              </button>

              <button className="link-button muted" type="button" onClick={() => cambiarVista('login')}>
                Volver al inicio de sesión
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}

function MobileLogo() {
  return (
    <div className="login-logo" aria-hidden="true">
      <Image src="/Logo-login.png" alt="" width={128} height={136} priority />
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <header className="form-header">
      <h1>{title}</h1>
      <p>{subtitle}</p>
    </header>
  );
}

function Field({
  id,
  label,
  type,
  autoComplete,
  placeholder,
  value,
  onChange,
}: {
  id: string;
  label: string;
  type: string;
  autoComplete: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="field-group">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function Feedback({ error, mensaje }: { error: string; mensaje: string }) {
  if (!error && !mensaje) return <div className="feedback-spacer" />;

  return (
    <div className={error ? 'feedback error' : 'feedback success'} role={error ? 'alert' : 'status'}>
      {error || mensaje}
    </div>
  );
}

function PasswordStrength({ fortaleza }: { fortaleza: Fortaleza }) {
  return (
    <div className="password-strength" aria-label={`Fortaleza de contraseña: ${fortaleza.texto}`}>
      <div className="strength-bars" aria-hidden="true">
        {[1, 2, 3, 4, 5].map((nivel) => (
          <span
            key={nivel}
            style={{ backgroundColor: nivel <= fortaleza.nivel ? fortaleza.color : undefined }}
          />
        ))}
      </div>
      <p style={{ color: fortaleza.color }}>{fortaleza.texto}</p>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 3l18 18M10.6 10.6A2 2 0 0 0 13.4 13.4M8.5 5.6A10.3 10.3 0 0 1 12 5c6.4 0 10 7 10 7a16.4 16.4 0 0 1-3.1 4.1M6.1 6.9C3.5 8.7 2 12 2 12s3.6 7 10 7a10.4 10.4 0 0 0 4.2-.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
