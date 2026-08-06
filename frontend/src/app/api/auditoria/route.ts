import { NextResponse } from 'next/server';
import { consultarLogs } from '@backend/services/auditoria.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await consultarLogs();
  return NextResponse.json(result.data);
}
