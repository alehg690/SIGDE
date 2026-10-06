import { NextRequest, NextResponse } from 'next/server';
import { verificarToken } from '@backend/utils/jwt';
import { getSessionCookieName, LEGACY_SESSION_COOKIE_NAME } from '@backend/utils/session-cookie';

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
  const isProtectedPath = PROTECTED_PATHS.some((path) => pathname.startsWith(path));
  const isAuthenticated = await hasValidSession(request);

  if (isProtectedPath && !isAuthenticated) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete(getSessionCookieName());
    response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
