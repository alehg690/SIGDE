import { NextRequest, NextResponse } from 'next/server';
import { verificarToken } from '@backend/utils/jwt';
import {
  getSessionCookieDeletionOptions,
  getSessionCookieName,
  LEGACY_SESSION_COOKIE_NAME,
} from '@backend/utils/session-cookie';
import { esMutacionSitioCruzado } from '@/app/api/_utils/request-origin';

const PROTECTED_PATHS = ['/dashboard'];

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(getSessionCookieName())?.value;
  if (!token) return false;

  try {
    await verificarToken(token);
    return true;
  } catch {
    return false;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/') && esMutacionSitioCruzado(request)) {
    return NextResponse.json(
      { error: 'Origen no permitido' },
      { status: 403, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  const isProtectedPath = PROTECTED_PATHS.some((path) => pathname.startsWith(path));

  if (isProtectedPath && !(await hasValidSession(request))) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(getSessionCookieName(), '', getSessionCookieDeletionOptions());
    response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/api/:path*'],
};
