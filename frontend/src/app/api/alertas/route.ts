import { NextResponse } from 'next/server';
import { listarAlertasActivas } from '@backend/services/alertas.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Admin', 'Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarAlertasActivas();
  return NextResponse.json(result.data);
}
