'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Vista = 'login' | 'recuperar' | 'codigo' | 'nueva-contrasena';

export default function Home() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>('login');
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [correoRecuperar, setCorreoRecuperar] = useState('');
  const [codigo, setCodigo] = useState('');
  const [nuevaContrasena, setNuevaContrasena] = useState('');
  const [confirmarContrasena, setConfirmarContrasena] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(false);

  const stats = [
    { num: '100%', label: 'Digital' },
    { num: '24/7', label: 'Acceso' },
    { num: 'IA', label: 'Integrada' },
  ];

  function resetear() {
    setError('');
    setMensaje('');
  }

  async function handleLogin() {
    resetear();
    if (!rolSeleccionado) {
      setError('Por favor selecciona un perfil');
      return;
    }
    setCargando(true);
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'login', correo, contrasena }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al iniciar sesión');
        setCorreo('');
        setContrasena('');
      } else {
        router.push('/dashboard');
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
        <h2 style={{ textAlign: 'center', color: '#0a1628', fontSize: 28, fontWeight: 600, margin: '0 0 6px' }}>Bienvenido</h2>
        <p style={{ textAlign: 'center', color: '#7a90a8', fontSize: 14, margin: '0 0 36px', fontWeight: 700 }}>Selecciona tu Perfil para Iniciar Sesion</p>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#434747', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Perfil</label>
        <select
          value={rolSeleccionado}
          onChange={e => { setRolSeleccionado(e.target.value); resetear(); }}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 20, border: '1px solid #d4dde8', borderRadius: 8, fontSize: 14, color: '#0a1628', background: '#fff', outline: 'none', cursor: 'pointer' }}
        >
          <option value="" disabled>Selecciona un perfil</option>
          <option value="Docente">Docente</option>
          <option value="Coordinador">Coordinador</option>
        </select>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#434747', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Correo</label>
        <input
          type="email" placeholder="Correo Electronico" value={correo}
          onChange={e => setCorreo(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 20, border: '1px solid #d4dde8', borderRadius: 8, fontSize: 14, color: '#0a1628', background: '#fff', outline: 'none' }}
        />

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#434747', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Contraseña</label>
        <input
          type="password" placeholder="••••••••" value={contrasena}
          onChange={e => setContrasena(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 8, border: '1px solid #d4dde8', borderRadius: 8, fontSize: 14, color: '#0a1628', background: '#fff', outline: 'none' }}
        />

        {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 16px' }}>{error}</p>}

        <button onClick={handleLogin} disabled={cargando} style={{ width: '100%', padding: 15, background: cargando ? '#4a6280' : '#0a1628', color: '#e8f4fd', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: cargando ? 'not-allowed' : 'pointer', marginBottom: 20, marginTop: 12, transition: 'background 0.2s' }}>
          {cargando ? 'Verificando...' : 'Ingresar al sistema'}
        </button>

        <p style={{ textAlign: 'center', fontSize: 12, color: '#7a90a8', margin: 0 }}>
          ¿Olvidaste tu contraseña?{' '}
          <a href="#" onClick={e => { e.preventDefault(); setVista('recuperar'); resetear(); }} style={{ color: '#185fa5', fontWeight: 700, textDecoration: 'none' }}>
            Recupérala aquí
          </a>
        </p>
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

        <button onClick={handleRecuperar} disabled={cargando} style={{ width: '100%', padding: 15, background: cargando ? '#4a6280' : '#0a1628', color: '#e8f4fd', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: cargando ? 'not-allowed' : 'pointer', marginBottom: 20, marginTop: 12 }}>
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
          onKeyDown={e => e.key === 'Enter' && setVista('nueva-contrasena')}
          style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', marginBottom: 8, border: '1px solid #d4dde8', borderRadius: 8, fontSize: 22, color: '#0a1628', background: '#fff', outline: 'none', letterSpacing: '8px', textAlign: 'center' }}
        />

        {error && <p style={{ color: '#e53e3e', fontSize: 13, margin: '0 0 16px' }}>{error}</p>}

        <button onClick={() => { resetear(); setVista('nueva-contrasena'); }} style={{ width: '100%', padding: 15, background: '#0a1628', color: '#e8f4fd', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 500, cursor: 'pointer', marginBottom: 20, marginTop: 12 }}>
          Verificar código
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
    <main style={{ position: 'fixed', inset: 0, display: 'flex', fontFamily: 'inherit' }}>

      {/* Panel izquierdo */}
      <div style={{ flex: 1, background: '#0a1628', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: 56, padding: '48px 72px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center' }}>
          <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontSize: 80, fontWeight: 700, letterSpacing: '0.12em', color: '#e8f4fd' }}>
            S<span style={{ color: '#63b3ed' }}>G</span>DE
          </span>
          <p style={{ color: 'rgba(200,220,240,0.35)', fontSize: 12, letterSpacing: '0.25em', textTransform: 'uppercase', margin: '8px 0 0' }}>
            Sistema de Gestión Digital Escolar
          </p>
        </div>

        {/* Descripción */}
        <p style={{ color: 'rgba(200,220,240,0.5)', fontSize: 16, lineHeight: 1.7, maxWidth: 380, margin: 0, textAlign: 'center' }}>
          Registro, seguimiento y análisis de convivencia en tiempo real.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 56 }}>
          {stats.map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ color: '#63b3ed', fontSize: 28, fontWeight: 600, margin: '0 0 4px' }}>{s.num}</p>
              <p style={{ color: 'rgba(200,220,240,0.4)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panel derecho */}
      <div style={{ width: 440, background: '#f7f9fc', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 52px' }}>
        {panelDerecho()}
      </div>
    </main>
  );
}