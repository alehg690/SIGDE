import { NextResponse } from 'next/server';
import { marcarComoLeida } from '@backend/services/notificaciones.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(_req: Request, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const notificacionId = Number(id);
  if (!Number.isInteger(notificacionId) || notificacionId <= 0) {
    return NextResponse.json({ error: 'Notificación no válida' }, { status: 400 });
  }

  const result = await marcarComoLeida(notificacionId, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
