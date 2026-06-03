'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

type UsuarioSesion = {
  id: number;
  correo: string;
  rol: string;
};

type SessionResponse = {
  autenticado: boolean;
  usuario?: UsuarioSesion;
  expiraEnMs?: number;
  error?: string;
};

const INACTIVIDAD_MS = 15 * 60 * 1000;
const AVISO_EXPIRACION_MS = 5 * 60 * 1000;

function formatearDuracion(ms: number) {
  const segundos = Math.max(0, Math.ceil(ms / 1000));
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return `${minutos}:${resto.toString().padStart(2, '0')}`;
}

export default function DashboardShell() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null);
  const [expiraEnMs, setExpiraEnMs] = useState<number | null>(null);
  const [inactivoEnMs, setInactivoEnMs] = useState(INACTIVIDAD_MS);
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);
  const [cerrando, setCerrando] = useState(false);

  const expiraPronto = typeof expiraEnMs === 'number' && expiraEnMs <= AVISO_EXPIRACION_MS;

  const resumenRol = useMemo(() => {
    if (!usuario) return [];

    const modulosPorRol: Record<string, string[]> = {
      Admin: ['Usuarios', 'Estudiantes', 'Configuración', 'Auditoría'],
      Coordinador: ['Alertas', 'Historiales', 'Reportes', 'Informes'],
      Docente: ['Mis reportes', 'Nuevo reporte', 'Historial estudiante'],
      Porteria: ['Salidas del día', 'Registrar salida'],
    };

    return modulosPorRol[usuario.rol] ?? ['Inicio', 'Perfil'];
  }, [usuario]);

  const cerrarSesion = useCallback(async (motivo?: string) => {
    setCerrando(true);

    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'logout' }),
      });
    } finally {
      sessionStorage.setItem('sigde_logout_message', motivo ?? 'Sesion cerrada correctamente.');
      router.replace('/');
    }
  }, [router]);

  useEffect(() => {
    let activo = true;

    async function cargarSesion() {
      try {
        const res = await fetch('/api/auth', { cache: 'no-store' });
        const data = (await res.json()) as SessionResponse;

        if (!activo) return;

        if (!res.ok || !data.autenticado || !data.usuario) {
          sessionStorage.setItem('sigde_logout_message', 'Tu sesión expiró. Inicia sesión nuevamente.');
          router.replace('/');
          return;
        }

        setUsuario(data.usuario);
        setExpiraEnMs(data.expiraEnMs ?? null);
      } catch {
        if (activo) {
          setMensaje('No pudimos verificar tu sesión. Revisa tu conexión.');
        }
      } finally {
        if (activo) {
          setCargando(false);
        }
      }
    }

    cargarSesion();
    return () => {
      activo = false;
    };
  }, [router]);

  useEffect(() => {
    if (typeof expiraEnMs !== 'number') return;

    const timer = window.setInterval(() => {
      setExpiraEnMs((actual) => {
        if (typeof actual !== 'number') return actual;
        const siguiente = Math.max(0, actual - 1000);
        if (siguiente <= 0) {
          window.clearInterval(timer);
          void cerrarSesion('Tu sesión expiró. Inicia sesión nuevamente.');
        }
        return siguiente;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cerrarSesion, expiraEnMs]);

  useEffect(() => {
    let ultimoMovimiento = Date.now();

    function registrarActividad() {
      ultimoMovimiento = Date.now();
      setInactivoEnMs(INACTIVIDAD_MS);
    }

    const eventos = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];
    eventos.forEach((evento) => window.addEventListener(evento, registrarActividad, { passive: true }));

    const timer = window.setInterval(() => {
      const restante = Math.max(0, INACTIVIDAD_MS - (Date.now() - ultimoMovimiento));
      setInactivoEnMs(restante);

      if (restante <= 0) {
        window.clearInterval(timer);
        void cerrarSesion('Cerramos tu sesión por inactividad.');
      }
    }, 1000);

    return () => {
      eventos.forEach((evento) => window.removeEventListener(evento, registrarActividad));
      window.clearInterval(timer);
    };
  }, [cerrarSesion]);

  if (cargando) {
    return (
      <main className="dashboard-shell dashboard-centered">
        <p>Verificando sesión...</p>
      </main>
    );
  }

  if (!usuario) {
    return (
      <main className="dashboard-shell dashboard-centered">
        <p>Redirigiendo al inicio de sesión...</p>
      </main>
    );
  }

  return (
    <main className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div>
          <span className="dashboard-brand">SIGDE</span>
          <p>Sistema de Gestión Digital Escolar</p>
        </div>
        <nav aria-label="Módulos principales">
          {resumenRol.map((modulo) => (
            <button key={modulo} type="button">
              {modulo}
            </button>
          ))}
        </nav>
      </aside>

      <section className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <p className="eyebrow">Panel principal</p>
            <h1>Bienvenido a SIGDE</h1>
            <span>{usuario.correo}</span>
          </div>
          <button className="secondary-button" type="button" disabled={cerrando} onClick={() => cerrarSesion()}>
            {cerrando ? 'Cerrando...' : 'Cerrar sesión'}
          </button>
        </header>

        {mensaje && <div className="dashboard-alert error">{mensaje}</div>}

        {expiraPronto && (
          <div className="dashboard-alert warning">
            Tu sesión expira en {formatearDuracion(expiraEnMs ?? 0)}. Guarda tus cambios.
          </div>
        )}

        <div className="dashboard-grid">
          <section className="dashboard-panel">
            <h2>Sesión activa</h2>
            <dl>
              <div>
                <dt>Rol</dt>
                <dd>{usuario.rol}</dd>
              </div>
              <div>
                <dt>Expira en</dt>
                <dd>{typeof expiraEnMs === 'number' ? formatearDuracion(expiraEnMs) : 'No disponible'}</dd>
              </div>
              <div>
                <dt>Cierre por inactividad</dt>
                <dd>{formatearDuracion(inactivoEnMs)}</dd>
              </div>
            </dl>
          </section>

          <section className="dashboard-panel">
            <h2>Siguiente módulo</h2>
            <p>
              Ya puedes continuar con reportes disciplinarios, estudiantes e historiales usando permisos por rol.
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
