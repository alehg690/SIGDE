import { NextRequest, NextResponse } from 'next/server';
import { listarNotificacionesPorAcudiente } from '@backend/services/notificaciones.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET(req: NextRequest) {
  const auth = await requerirSesion(['Admin', 'Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const acudienteId = Number(req.nextUrl.searchParams.get('acudienteId'));
  if (!Number.isInteger(acudienteId) || acudienteId <= 0) {
    return NextResponse.json({ error: 'Acudiente no válido' }, { status: 400 });
  }

  const result = await listarNotificacionesPorAcudiente(acudienteId);
  return NextResponse.json(result.data);
}
