import { NextRequest, NextResponse } from 'next/server';
import { actualizarPerfil, cerrarOtrasSesiones } from '@backend/services/perfil.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { crearToken } from '@backend/utils/jwt';
import { getSessionCookieName, getSessionCookieOptions, LEGACY_SESSION_COOKIE_NAME } from '@backend/utils/session-cookie';

export async function PATCH(request: NextRequest) {
  const auth = await requerirSesion();
  if (esErrorAuth(auth)) return auth.response;
  const body = await request.json().catch(() => null);
  if (typeof body?.nombre !== 'string') return NextResponse.json({ error: 'Ingresa un nombre válido.' }, { status: 400 });
  const result = await actualizarPerfil(body.nombre, auth.usuario);
  return NextResponse.json('error' in result ? { error: result.error } : result.data, { status: result.status });
}

export async function POST() {
  const auth = await requerirSesion();
  if (esErrorAuth(auth)) return auth.response;
  const result = await cerrarOtrasSesiones(auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  const token = await crearToken({ id: auth.usuario.id, versionSesion: result.data.versionSesion });
  const response = NextResponse.json({ mensaje: result.data.mensaje });
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
  response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
  return response;
}
