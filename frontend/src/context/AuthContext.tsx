'use client';

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError } from '@/services/api';
import { getSession, logout, renovarSesion, type SessionUser } from '@/services/auth.service';

const INACTIVITY_LIMIT_MS = 30 * 60 * 1000;
const ACTIVITY_REFRESH_INTERVAL_MS = 60 * 1000;
const EXPIRATION_WARNING_MS = 5 * 60 * 1000;
const SESSION_MESSAGE_KEY = 'sigde_logout_message';
export const TAB_SESSION_KEY = 'sigde_tab_session';

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
  const ultimaRenovacionRef = useRef(0);

  const refrescarSesion = useCallback(async () => {
    setCargando(true);
    try {
      if (!sessionStorage.getItem(TAB_SESSION_KEY)) {
        await logout().catch(() => undefined);
        setUsuario(null);
        setExpiraEn(null);
        return;
      }

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
    sessionStorage.removeItem(TAB_SESSION_KEY);
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
    if (cargando || usuario || window.location.pathname === '/') return;
    window.location.replace('/');
  }, [cargando, usuario]);

  useEffect(() => {
    if (!usuario) return;

    let inactivityTimer: number | undefined;
    const activityEvents = ['click', 'keydown', 'mousemove', 'scroll', 'touchstart'];

    const registrarActividad = () => {
      if (inactivityTimer) window.clearTimeout(inactivityTimer);
      inactivityTimer = window.setTimeout(() => {
        void cerrarSesion('Sesion cerrada por inactividad.');
      }, INACTIVITY_LIMIT_MS);

      if (Date.now() - ultimaRenovacionRef.current < ACTIVITY_REFRESH_INTERVAL_MS) return;

      ultimaRenovacionRef.current = Date.now();
      void renovarSesion()
        .then((session) => setExpiraEn(session.expiraEn ?? null))
        .catch(() => void cerrarSesion('Sesion cerrada por inactividad.'));
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
