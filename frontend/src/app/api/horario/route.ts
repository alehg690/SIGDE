import { NextResponse } from 'next/server';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { obtenerHorarioInstitucional } from '@backend/services/horario.service';

export async function GET() {
  const auth = await requerirSesion();
  if (esErrorAuth(auth)) return auth.response;
  const incluirHistorial = auth.usuario.rol === 'Admin' || auth.usuario.rol === 'Coordinador';
  const result = await obtenerHorarioInstitucional(incluirHistorial);
  return NextResponse.json(result.data);
}
