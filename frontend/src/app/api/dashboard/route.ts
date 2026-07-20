import { NextResponse } from 'next/server';
import { obtenerResumenDashboard } from '@backend/services/dashboard.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion();
  if (esErrorAuth(auth)) return auth.response;

  const result = await obtenerResumenDashboard(auth.usuario);
  return NextResponse.json(result.data);
}
