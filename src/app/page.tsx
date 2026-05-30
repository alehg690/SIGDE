'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginPanel from '@/frontend/components/LoginPanel';
import Image from 'next/image';

type Vista = 'login' | 'recuperar' | 'codigo' | 'nueva-contrasena';

function calcularFortaleza(pass: string): { nivel: number; texto: string; color: string } {
  let puntos = 0;
  if (pass.length >= 8) puntos++;
  if (pass.length >= 12) puntos++;
  if (/[A-Z]/.test(pass)) puntos++;
  if (/[0-9]/.test(pass)) puntos++;
  if (/[^A-Za-z0-9]/.test(pass)) puntos++;

  if (puntos <= 1) return { nivel: 1, texto: 'Muy débil', color: '#e53e3e' };
  if (puntos === 2) return { nivel: 2, texto: 'Débil', color: '#dd6b20' };
  if (puntos === 3) return { nivel: 3, texto: 'Aceptable', color: '#d69e2e' };
  if (puntos === 4) return { nivel: 4, texto: 'Fuerte', color: '#38a169' };
  return { nivel: 5, texto: 'Muy fuerte', color: '#2f855a' };
}

export default function Home() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>('login');
  const [contrasena, setContrasena] = useState('');
  const [correoRecuperar, setCorreoRecuperar] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [recordarUsuario, setRecordarUsuario] = useState(false);

  const [correo, setCorreo] = useState(() =>
  typeof window !== 'undefined' ? localStorage.getItem('sigde_correo') ?? '' : ''
);

  function resetear() {
    setError('');
    setMensaje('');
  }

  async function handleLogin() {
    resetear();
    setCargando(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'login', correo, contrasena }),
      });

      if (recordarUsuario) {
        localStorage.setItem('sigde_correo', correo);
      } else {
        localStorage.removeItem('sigde_correo');
      }

      const data = await res.json();
      if (!res.ok) {
        // Fix 5: solo se limpia la contraseña, el correo se conserva
        setContrasena('');
        setError(data.error || 'Error al iniciar sesión');
      } else {
        router.replace('/dashboard');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  }

  async function handleRecuperar() {
    resetear();
    setCargando(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'recuperar', correo: correoRecuperar }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setMensaje('Código enviado a tu correo.');
        setVista('codigo');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  }

  async function handleVerificarCodigo() {
    resetear();
    if (!codigo || codigo.length < 6) {
      setError('Ingresa el código de 6 dígitos');
      return;
    }
    setCargando(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'verificarCodigo', correo: correoRecuperar, codigo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setVista('nueva-contrasena');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  }

  async function handleCambiarContrasena() {
    resetear();
    // Fix 4: validación mínima en el cliente
    if (nuevaContrasena.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (nuevaContrasena !== confirmarContrasena) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setCargando(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'cambiarContrasena', correo: correoRecuperar, codigo, nuevaContrasena }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
      } else {
        setMensaje('¡Contraseña actualizada! Ya puedes iniciar sesión.');
        setTimeout(() => setVista('login'), 2000);
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setCargando(false);
    }
  }

  // Fix 6: color del ícono adaptado según contexto (desktop vs móvil)
  const iconColor = '#8a9bb0';

  // Estilos compartidos para campos en vistas de recuperación — Fix 7
  const inputRecuperacion: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 16px',
    marginBottom: 8,
    border: '1px solid',
    borderColor: 'var(--input-border, #d4dde8)',
    borderRadius: 8,
    fontSize: 14,
    color: 'var(--input-color, #0a1628)',
    background: 'var(--input-bg, #fff)',
    outline: 'none',
  };

  const tituloRecuperacion: React.CSSProperties = {
    fontSize: 22,
    fontWeight: 600,
    margin: '0 0 6px',
    color: 'var(--titulo-color, #0a1628)',
  };

  const subtituloRecuperacion: React.CSSProperties = {
    fontSize: 14,
    margin: '0 0 28px',
    color: 'var(--subtitulo-color, #7a90a8)',
  };

  const labelRecuperacion: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 8,
    color: 'var(--label-color, #434747)',
  };

  const botonPrimario = (activo: boolean): React.CSSProperties => ({
    width: '100%',
    padding: 15,
    background: cargando || !activo ? '#4a6280' : '#63b3ed',
    color: '#e8f4fd',
    opacity: !activo ? 0.5 : 1,
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 500,
    cursor: cargando || !activo ? 'not-allowed' : 'pointer',
    marginBottom: 20,
    marginTop: 12,
    transition: 'all 0.2s',
  });

  const linkVolver: React.CSSProperties = {
    color: '#185fa5',
    fontWeight: 700,
    textDecoration: 'none',
  };

  const fortaleza = nuevaContrasena ? calcularFortaleza(nuevaContrasena) : null;

  const panelDerecho = () => {
    if (vista === 'login') return (
      <>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={{
            width: 200, height: 200, borderRadius: '50%', background: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)', marginBottom: 20,
          }}>
            <Image src="Logo.png" alt="SIGDE Logo" width={200} height={200} loading="eager" />
          </div>
        </div>

        <h2 className="login-title" style={{ textAlign: 'center', fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>
          Iniciar sesión
        </h2>
        <p className="login-subtitle" style={{ textAlign: 'center', fontSize: 13, margin: '0 0 32px' }}>
          Ingresa tus credenciales para continuar
        </p>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={correo}
          onChange={e => setCorreo(e.target.value)}
          className="input-field"
        />

        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input
            type={mostrarContrasena ? 'text' : 'password'}
            placeholder="Contraseña"
            value={contrasena}
            onChange={e => setContrasena(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="input-field-password"
          />
          {/* Fix 6: color neutro visible tanto en desktop como móvil */}
          <button
            onMouseDown={() => setMostrarContrasena(true)}
            onMouseUp={() => setMostrarContrasena(false)}
            onMouseLeave={() => setMostrarContrasena(false)}
            onTouchStart={() => setMostrarContrasena(true)}
            onTouchEnd={() => setMostrarContrasena(false)}
            aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            style={{
              position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: 4,
              color: iconColor,
            }}
          >
            {mostrarContrasena ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
            )}
          </button>
        </div>

        {error && <p style={{ color: '#fc8181', fontSize: 13, margin: '8px 0 16px' }}>{error}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 4px' }}>
          <input
            type="checkbox"
            id="recordar"
            checked={recordarUsuario}
            onChange={e => {
              setRecordarUsuario(e.target.checked);
              if (!e.target.checked) localStorage.removeItem('sigde_correo');
            }}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#63b3ed' }}
          />
          <label htmlFor="recordar" style={{ fontSize: 13, cursor: 'pointer' }} className="login-subtitle">
            Recordar usuario
          </label>
        </div>

        <button
          onClick={!correo || !contrasena ? () => setError('Por favor completa todos los campos') : handleLogin}
          disabled={cargando}
          style={{
            width: '100%', padding: 15,
            background: cargando ? '#4a6280' : (!correo || !contrasena) ? '#4a6280' : '#63b3ed',
            color: '#e8f4fd',
            opacity: !contrasena || !correo ? 0.5 : 1,
            border: 'none', borderRadius: 10,
            fontSize: 14, fontWeight: 600,
            cursor: 'pointer',
            marginTop: 8, marginBottom: 20,
            transition: 'all 0.2s',
          }}
        >
          {cargando ? 'Verificando...' : 'Ingresar al sistema'}
        </button>

        <a
          href="#"
          onClick={e => { e.preventDefault(); setVista('recuperar'); resetear(); }}
          style={{ color: '#63b3ed', textAlign: 'center', fontSize: 12, margin: 0, display: 'block' }}
        >
          ¿Olvidaste tu contraseña?
        </a>
      </>
    );

    // Fix 7: vistas de recuperación con variables CSS para soporte de modo oscuro/móvil
    if (vista === 'recuperar') return (
      <>
        {/* Fix 7: logo visible en móvil */}
        <div className="login-mobile-logo" style={{ display: 'none', justifyContent: 'center', marginBottom: 24 }}>
          <Image src="Logo.png" alt="SIGDE Logo" width={80} height={80} style={{ borderRadius: '50%' }} />
        </div>

        <h2 style={tituloRecuperacion}>Recuperar contraseña</h2>
        <p style={subtituloRecuperacion}>Ingresa tu correo institucional y te enviaremos un código.</p>

        <label style={labelRecuperacion}>Correo</label>
        <input
          type="email"
          placeholder="Correo electrónico"
          value={correoRecuperar}
          onChange={e => setCorreoRecuperar(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRecuperar()}
          style={inputRecuperacion}
          className="input-field"
        />

        {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 16px' }}>{error}</p>}
        {mensaje && <p style={{ color: '#2f855a', fontSize: 13, margin: '0 0 16px' }}>{mensaje}</p>}

        <button
          onClick={!correoRecuperar ? () => setError('Ingresa tu correo') : handleRecuperar}
          disabled={cargando}
          style={botonPrimario(!!correoRecuperar)}
        >
          {cargando ? 'Enviando...' : 'Enviar código'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#7a90a8', margin: 0 }}>
          <a href="#" onClick={e => { e.preventDefault(); setVista('login'); resetear(); }} style={linkVolver}>
            ← Volver al inicio de sesión
          </a>
        </p>
      </>
    );

    if (vista === 'codigo') return (
      <>
        <div className="login-mobile-logo" style={{ display: 'none', justifyContent: 'center', marginBottom: 24 }}>
          <Image src="Logo.png" alt="SIGDE Logo" width={80} height={80} style={{ borderRadius: '50%' }} />
        </div>

        <h2 style={tituloRecuperacion}>Verificar código</h2>
        <p style={subtituloRecuperacion}>Ingresa el código de 6 dígitos que enviamos a tu correo.</p>

        <label style={labelRecuperacion}>Código</label>
        <input
          type="text"
          placeholder="000000"
          value={codigo}
          maxLength={6}
          onChange={e => setCodigo(e.target.value.replace(/\D/g, ''))}
          onKeyDown={e => e.key === 'Enter' && handleVerificarCodigo()}
          style={{
            ...inputRecuperacion,
            fontSize: 22,
            letterSpacing: '8px',
            textAlign: 'center',
          }}
          className="input-field"
        />

        {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 16px' }}>{error}</p>}

        <button
          onClick={handleVerificarCodigo}
          disabled={cargando}
          style={botonPrimario(codigo.length === 6)}
        >
          {cargando ? 'Verificando...' : 'Verificar código'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#7a90a8', margin: 0 }}>
          <a href="#" onClick={e => { e.preventDefault(); setVista('recuperar'); resetear(); }} style={linkVolver}>
            ← Reenviar código
          </a>
        </p>
      </>
    );

    if (vista === 'nueva-contrasena') return (
      <>
        <div className="login-mobile-logo" style={{ display: 'none', justifyContent: 'center', marginBottom: 24 }}>
          <Image src="Logo.png" alt="SIGDE Logo" width={80} height={80} style={{ borderRadius: '50%' }} />
        </div>

        <h2 style={tituloRecuperacion}>Nueva contraseña</h2>
        <p style={subtituloRecuperacion}>Ingresa y confirma tu nueva contraseña.</p>

        <label style={labelRecuperacion}>Nueva contraseña</label>
        <input
          type="password"
          placeholder="Mínimo 8 caracteres"
          value={nuevaContrasena}
          onChange={e => setNuevaContrasena(e.target.value)}
          style={{ ...inputRecuperacion, marginBottom: 4 }}
          className="input-field"
        />

        {/* Fix 8: indicador de fortaleza */}
        {nuevaContrasena.length > 0 && fortaleza && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
              {[1, 2, 3, 4, 5].map(n => (
                <div key={n} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: n <= fortaleza.nivel ? fortaleza.color : '#e2e8f0',
                  transition: 'background 0.2s',
                }} />
              ))}
            </div>
            <p style={{ fontSize: 12, color: fortaleza.color, margin: 0 }}>{fortaleza.texto}</p>
          </div>
        )}

        <label style={labelRecuperacion}>Confirmar contraseña</label>
        <input
          type="password"
          placeholder="Repite tu contraseña"
          value={confirmarContrasena}
          onChange={e => setConfirmarContrasena(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCambiarContrasena()}
          style={{ ...inputRecuperacion, marginBottom: 8 }}
          className="input-field"
        />

        {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 16px' }}>{error}</p>}
        {mensaje && <p style={{ color: '#2f855a', fontSize: 13, margin: '0 0 16px' }}>{mensaje}</p>}

        <button
          onClick={handleCambiarContrasena}
          disabled={cargando}
          style={botonPrimario(nuevaContrasena.length >= 8 && !!confirmarContrasena)}
        >
          {cargando ? 'Guardando...' : 'Guardar contraseña'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#7a90a8', margin: 0 }}>
          <a href="#" onClick={e => { e.preventDefault(); setVista('login'); resetear(); }} style={linkVolver}>
            ← Volver al inicio de sesión
          </a>
        </p>
      </>
    );
  };

  return (
    <main className="login-container">
      <LoginPanel />
      <div className="login-form-panel">
        {panelDerecho()}
      </div>
    </main>
  );
}