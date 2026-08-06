import { NextResponse } from 'next/server';
import { obtenerManualConvivenciaBackend } from '@backend/services/manual-convivencia.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  return NextResponse.json(obtenerManualConvivenciaBackend());
}
