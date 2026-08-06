'use client';

import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError } from '@/services/api';
import { getSession, logout, type SessionUser } from '@/services/auth.service';

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const EXPIRATION_WARNING_MS = 5 * 60 * 1000;
const SESSION_MESSAGE_KEY = 'sigde_logout_message';

type AuthContextValue = {
  usuario: SessionUser | null;
  cargando: boolean;
  autenticado: boolean;
  expiraEn: number | null;
  refrescarSesion: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<SessionUser | null>(null);
  const [expiraEn, setExpiraEn] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [avisoSesion, setAvisoSesion] = useState('');

  const refrescarSesion = useCallback(async () => {
    setCargando(true);
    try {
      const session = await getSession();
      setUsuario(session.autenticado ? session.usuario ?? null : null);
      setExpiraEn(session.autenticado ? session.expiraEn ?? null : null);
    } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) {
        console.error(error);
      }
      setUsuario(null);
      setExpiraEn(null);
    } finally {
      setCargando(false);
    }
  }, []);

  const cerrarSesion = useCallback(async (message = 'Sesion cerrada correctamente.') => {
    await logout();
    setUsuario(null);
    setExpiraEn(null);
    sessionStorage.setItem(SESSION_MESSAGE_KEY, message);
    window.location.assign('/');
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => refrescarSesion());
  }, [refrescarSesion]);

  useEffect(() => {
    if (!usuario) return;

    let inactivityTimer: number | undefined;
    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

    const scheduleInactivityLogout = () => {
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        void cerrarSesion('Sesion cerrada por inactividad.');
      }, INACTIVITY_LIMIT_MS);
    };

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, scheduleInactivityLogout, { passive: true });
    });
    scheduleInactivityLogout();

    return () => {
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, scheduleInactivityLogout));
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
