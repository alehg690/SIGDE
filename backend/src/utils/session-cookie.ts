export const SESSION_MAX_AGE_SECONDS = 30 * 60;
export const LEGACY_SESSION_COOKIE_NAME = 'token';

export function getSessionCookieName() {
  return process.env.NODE_ENV === 'production'
    ? '__Host-sigde-session'
    : 'sigde-session';
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: '/',
    priority: 'high' as const,
  };
}
