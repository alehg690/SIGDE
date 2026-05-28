'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LoginPanel from '@/frontend/components/LoginPanel';
import Image from "next/image";

type Vista = 'login' | 'recuperar' | 'codigo' | 'nueva-contrasena';

export default function Home() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>('login');
  const [correo, setCorreo] = useState('');
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

  useEffect(() => {
  const correoGuardado = localStorage.getItem('sigde_correo');

  if (correoGuardado) {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCorreo(correoGuardado);

    setRecordarUsuario(true);
  }
}, []);


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
        setError(data.error || 'Error al iniciar sesión');
        setCorreo('');
        setContrasena('');
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

  const panelDerecho = () => {
    if (vista === 'login') return (
      <>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
  <div
  style={{
    width: 200,
    height: 200,
    borderRadius: "50%",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
    marginBottom: 20,
  }}
>
  <Image
    src="/logo.png"
    alt="SIGDE Logo"
    width={200}
    height={200}
    loading="eager"
  />
</div>
</div>
        <h2 className="login-title" style={{ textAlign: 'center', fontSize: 22, fontWeight: 600, margin: '0 0 8px' }}>Iniciar sesión</h2>
        <p className="login-subtitle" style={{ textAlign: 'center', fontSize: 13, margin: '0 0 32px' }}>Ingresa tus credenciales para continuar</p>

        <input
  type="email" placeholder="Correo electrónico" value={correo}
  onChange={e => setCorreo(e.target.value)}
  className="input-field"
  style={{}}
/>

        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input
  type={mostrarContrasena ? 'text' : 'password'}
  placeholder="Contraseña"
  value={contrasena}
  onChange={e => setContrasena(e.target.value)}
  onKeyDown={e => e.key === 'Enter' && handleLogin()}
  className="input-field-password"
  style={{}}
/>
          <button
            onMouseDown={() => setMostrarContrasena(true)}
            onMouseUp={() => setMostrarContrasena(false)}
            onMouseLeave={() => setMostrarContrasena(false)}
            onTouchStart={() => setMostrarContrasena(true)}
            onTouchEnd={() => setMostrarContrasena(false)}
            style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'rgba(200,220,240,0.5)' }}
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

          <a href="#" onClick={e => { e.preventDefault(); setVista('recuperar'); resetear(); }} style={{ color: '#63b3ed', textAlign: 'center', fontSize: 12, margin: 0 }}>
            ¿Olvidaste tu Contraseña?
          </a>
      </>
    );

    if (vista === 'recuperar') return (
      <>
        <h2 style={{ color: '#0a1628', fontSize: 28, fontWeight: 600, margin: '0 0 6px' }}>Recuperar contraseña</h2>
        <p style={{ color: '#7a90a8', fontSize: 14, margin: '0 0 36px' }}>Ingresa tu correo institucional y te enviaremos un código.</p>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#434747', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Correo</label>
        <input
          type="email" placeholder="Correo Electronico" value={correoRecuperar}
          onChange={e => setCorreoRecuperar(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleRecuperar()}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 8, border: '1px solid #d4dde8', borderRadius: 8, fontSize: 14, color: '#0a1628', background: '#fff', outline: 'none' }}
        />

        {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 16px' }}>{error}</p>}
        {mensaje && <p style={{ color: '#2f855a', fontSize: 13, margin: '0 0 16px' }}>{mensaje}</p>}

        <button 
  onClick={!correoRecuperar ? () => setError('Ingresa tu correo') : handleRecuperar} 
  disabled={cargando}
  style={{
    width: '100%', padding: 15,
    background: cargando ? '#4a6280' : !correoRecuperar ? '#4a6280' : '#63b3ed',
    color: '#e8f4fd',
    opacity: !correoRecuperar ? 0.5 : 1,
    border: 'none',
    borderRadius: 8,
    fontSize: 14, fontWeight: 500,
    cursor: 'pointer',
    marginBottom: 20, marginTop: 12,
    transition: 'all 0.2s',
  }}
>
  {cargando ? 'Enviando...' : 'Enviar código'}
</button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#7a90a8', margin: 0 }}>
          <a href="#" onClick={e => { e.preventDefault(); setVista('login'); resetear(); }} style={{ color: '#185fa5', fontWeight: 700, textDecoration: 'none' }}>
            ← Volver al inicio de sesión
          </a>
        </p>
      </>
    );

    if (vista === 'codigo') return (
      <>
        <h2 style={{ color: '#0a1628', fontSize: 28, fontWeight: 600, margin: '0 0 6px' }}>Verificar código</h2>
        <p style={{ color: '#7a90a8', fontSize: 14, margin: '0 0 36px' }}>Ingresa el código de 6 dígitos que enviamos a tu correo.</p>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#434747', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Código</label>
        <input
          type="text" placeholder="000000" value={codigo} maxLength={6}
          onChange={e => setCodigo(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleVerificarCodigo()}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 8, border: '1px solid #d4dde8', borderRadius: 8, fontSize: 22, color: '#0a1628', background: '#fff', outline: 'none', letterSpacing: '8px', textAlign: 'center' }}
        />

        {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 16px' }}>{error}</p>}

        <button onClick={handleVerificarCodigo} disabled={cargando} style={{ width: '100%', padding: 15, background: cargando ? '#4a6280' : '#0a1628', color: '#e8f4fd', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: cargando ? 'not-allowed' : 'pointer', marginBottom: 20, marginTop: 12 }}>
          {cargando ? 'Verificando...' : 'Verificar código'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#7a90a8', margin: 0 }}>
          <a href="#" onClick={e => { e.preventDefault(); setVista('recuperar'); resetear(); }} style={{ color: '#185fa5', fontWeight: 700, textDecoration: 'none' }}>
            ← Reenviar código
          </a>
        </p>
      </>
    );

    if (vista === 'nueva-contrasena') return (
      <>
        <h2 style={{ color: '#0a1628', fontSize: 28, fontWeight: 600, margin: '0 0 6px' }}>Nueva contraseña</h2>
        <p style={{ color: '#7a90a8', fontSize: 14, margin: '0 0 36px' }}>Ingresa y confirma tu nueva contraseña.</p>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#434747', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Nueva contraseña</label>
        <input
          type="password" placeholder="••••••••" value={nuevaContrasena}
          onChange={e => setNuevaContrasena(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 20, border: '1px solid #d4dde8', borderRadius: 8, fontSize: 14, color: '#0a1628', background: '#fff', outline: 'none' }}
        />

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#434747', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Confirmar contraseña</label>
        <input
          type="password" placeholder="••••••••" value={confirmarContrasena}
          onChange={e => setConfirmarContrasena(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCambiarContrasena()}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 8, border: '1px solid #d4dde8', borderRadius: 8, fontSize: 14, color: '#0a1628', background: '#fff', outline: 'none' }}
        />

        {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 16px' }}>{error}</p>}
        {mensaje && <p style={{ color: '#2f855a', fontSize: 13, margin: '0 0 16px' }}>{mensaje}</p>}

        <button onClick={handleCambiarContrasena} disabled={cargando} style={{ width: '100%', padding: 15, background: cargando ? '#4a6280' : '#0a1628', color: '#e8f4fd', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: cargando ? 'not-allowed' : 'pointer', marginBottom: 20, marginTop: 12 }}>
          {cargando ? 'Guardando...' : 'Guardar contraseña'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#7a90a8', margin: 0 }}>
          <a href="#" onClick={e => { e.preventDefault(); setVista('login'); resetear(); }} style={{ color: '#185fa5', fontWeight: 700, textDecoration: 'none' }}>
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