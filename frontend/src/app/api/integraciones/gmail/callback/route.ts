import { NextRequest, NextResponse } from 'next/server';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { completeGmailAuthorization } from '@backend/services/gmail-integration.service';

export async function GET(request: NextRequest) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return NextResponse.redirect(new URL('/dashboard/configuracion?gmail=sesion', request.nextUrl.origin));
  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');
  const oauthError = request.nextUrl.searchParams.get('error');
  if (oauthError || !code || !state) {
    return NextResponse.redirect(new URL('/dashboard/configuracion?gmail=cancelado', request.nextUrl.origin));
  }
  const result = await completeGmailAuthorization(request.nextUrl.origin, code, state, auth.usuario);
  const outcome = 'error' in result ? 'error' : 'conectado';
  return NextResponse.redirect(new URL(`/dashboard/configuracion?gmail=${outcome}`, request.nextUrl.origin));
}
