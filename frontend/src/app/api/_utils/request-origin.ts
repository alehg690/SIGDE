import type { NextRequest } from 'next/server';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() || null;
}

function forwardedOrigin(request: NextRequest) {
  const host = firstHeaderValue(request.headers.get('x-forwarded-host'))
    || request.headers.get('host')?.trim();
  const protocol = firstHeaderValue(request.headers.get('x-forwarded-proto'))
    || request.nextUrl.protocol.replace(':', '');

  if (!host || !protocol) return null;

  try {
    return new URL(`${protocol}://${host}`).origin;
  } catch {
    return null;
  }
}

export function esMutacionSitioCruzado(request: NextRequest) {
  if (SAFE_METHODS.has(request.method)) return false;

  const fetchSite = request.headers.get('sec-fetch-site');
  if (fetchSite === 'cross-site') return true;
  if (fetchSite === 'same-origin') return false;

  const origin = request.headers.get('origin');
  if (!origin) return false;

  const allowedOrigins = new Set([
    request.nextUrl.origin,
    forwardedOrigin(request),
  ].filter((value): value is string => Boolean(value)));

  return !allowedOrigins.has(origin);
}
