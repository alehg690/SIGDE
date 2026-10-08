'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/services/api';
import { getSession, logout, renovarSesion, type SessionUser } from '@/services/auth.service';

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const ACTIVITY_REFRESH_INTERVAL_MS = 60 * 1000;
const EXPIRATION_WARNING_MS = 5 * 60 * 1000;
const SESSION_MESSAGE_KEY = 'sigde_logout_message';

type AuthContextValue = {
  usuario: SessionUser | null;
  cargando: boolean;
  autenticado: boolean;
  expiraEn: number | null;
  refrescarSesion: () => Promise<void>;
  cerrarSesion: (message?: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [usuario, setUsuario] = useState<SessionUser | null>(null);
  const [expiraEn, setExpiraEn] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [avisoSesion, setAvisoSesion] = useState('');
  const ultimaRenovacionRef = useRef(0);
  const cerrandoSesionRef = useRef(false);
  const renovacionEnCursoRef = useRef<ReturnType<typeof renovarSesion> | null>(null);

  const refrescarSesion = useCallback(async () => {
    setCargando(true);
    try {
      const session = await getSession();
      setUsuario(session.autenticado ? session.usuario ?? null : null);
      setExpiraEn(session.autenticado ? session.expiraEn ?? null : null);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        sessionStorage.setItem(SESSION_MESSAGE_KEY, 'Tu sesión expiró. Inicia sesión nuevamente.');
        router.replace('/');
      } else {
        console.error(error);
      }
      setUsuario(null);
      setExpiraEn(null);
    } finally {
      setCargando(false);
    }
  }, [router]);

  const cerrarSesion = useCallback(async (message = 'Sesion cerrada correctamente.') => {
    if (cerrandoSesionRef.current) return;
    cerrandoSesionRef.current = true;

    try {
      // Una renovación iniciada justo antes del logout puede volver a escribir la
      // cookie de sesión. Esperamos a que termine y eliminamos la cookie después.
      await renovacionEnCursoRef.current?.catch(() => undefined);
      await logout();
    } catch (error) {
      console.error(error);
      setAvisoSesion('No fue posible cerrar la sesión. Revisa tu conexión e inténtalo de nuevo.');
      cerrandoSesionRef.current = false;
      return;
    }
    setUsuario(null);
    setExpiraEn(null);
    sessionStorage.setItem(SESSION_MESSAGE_KEY, message);
    router.replace('/');

    // Para permitir un inicio y cierre posteriores sin desmontar el layout raíz.
    window.setTimeout(() => {
      cerrandoSesionRef.current = false;
    }, 0);
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(() => refrescarSesion());
  }, [refrescarSesion]);

  useEffect(() => {
    if (cargando || usuario || window.location.pathname === '/') return;
    router.replace('/');
  }, [cargando, router, usuario]);

  useEffect(() => {
    if (!usuario) return;

    let inactivityTimer: number | undefined;
    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

    const registrarActividad = () => {
      if (cerrandoSesionRef.current) return;

      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        void cerrarSesion('Sesion cerrada por inactividad.');
      }, INACTIVITY_LIMIT_MS);

      if (Date.now() - ultimaRenovacionRef.current < ACTIVITY_REFRESH_INTERVAL_MS) return;

      ultimaRenovacionRef.current = Date.now();
      const renovacion = renovarSesion();
      renovacionEnCursoRef.current = renovacion;
      void renovacion
        .then((session) => {
          if (!cerrandoSesionRef.current) setExpiraEn(session.expiraEn ?? null);
        })
        .catch(() => {
          if (!cerrandoSesionRef.current) void cerrarSesion('Sesion cerrada por inactividad.');
        })
        .finally(() => {
          if (renovacionEnCursoRef.current === renovacion) {
            renovacionEnCursoRef.current = null;
          }
        });
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, registrarActividad, { passive: true });
    });
    registrarActividad();

    return () => {
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, registrarActividad));
    };
  }, [usuario, cerrarSesion]);

  useEffect(() => {
    if (!expiraEn) return;

    const expiresAtMs = expiraEn * 1000;
    const warningDelay = Math.max(0, expiresAtMs - Date.now() - EXPIRATION_WARNING_MS);
    const logoutDelay = Math.max(0, expiresAtMs - Date.now());

    const warningTimer = window.setTimeout(() => {
      setAvisoSesion('Tu sesion esta por expirar. Guarda tu trabajo y vuelve a iniciar sesion si es necesario.');
    }, warningDelay);

    const logoutTimer = window.setTimeout(() => {
      void cerrarSesion('Tu sesion expiro. Inicia sesion nuevamente.');
    }, logoutDelay);

    return () => {
      window.clearTimeout(warningTimer);
      window.clearTimeout(logoutTimer);
    };
  }, [expiraEn, cerrarSesion]);

  const value = useMemo<AuthContextValue>(() => ({
    usuario,
    cargando,
    autenticado: Boolean(usuario),
    expiraEn,
    refrescarSesion,
    cerrarSesion,
  }), [usuario, cargando, expiraEn, refrescarSesion, cerrarSesion]);

  return (
    <AuthContext.Provider value={value}>
      {children}
      {avisoSesion && (
        <div className="session-toast" role="status">
          <span>{avisoSesion}</span>
          <button type="button" onClick={() => setAvisoSesion('')}>Entendido</button>
        </div>
      )}
    </AuthContext.Provider>
  );
}
