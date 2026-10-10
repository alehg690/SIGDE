import { NextRequest, NextResponse } from 'next/server';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { disconnectGmail, gmailAuthorizationUrl, gmailStatus } from '@backend/services/gmail-integration.service';

export async function GET() {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  return NextResponse.json(await gmailStatus());
}

export async function POST(request: NextRequest) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  const result = await gmailAuthorizationUrl(request.nextUrl.origin, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function DELETE() {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  const result = await disconnectGmail(auth.usuario);
  return NextResponse.json(result.data);
}
