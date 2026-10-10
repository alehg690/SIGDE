import { NextRequest, NextResponse } from 'next/server';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { syncGmail } from '@backend/services/gmail-integration.service';

function cronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  return Boolean(secret && request.headers.get('authorization') === `Bearer ${secret}`);
}

export async function GET(request: NextRequest) {
  if (!cronAuthorized(request)) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  const result = await syncGmail();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function POST() {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  const result = await syncGmail();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
