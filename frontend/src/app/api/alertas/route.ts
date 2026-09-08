import { NextResponse } from 'next/server';
import { listarAlertasActivas } from '@backend/services/alertas.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET(request: Request) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarAlertasActivas(new URL(request.url).searchParams.get('historial') === '1');
  return NextResponse.json(result.data);
}
