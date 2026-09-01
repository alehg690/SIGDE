import { NextRequest, NextResponse } from 'next/server';
import { crearNotificacionManual, listarNotificaciones } from '@backend/services/notificaciones.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET(req: NextRequest) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const rawAcudienteId = req.nextUrl.searchParams.get('acudienteId');
  const acudienteId = rawAcudienteId ? Number(rawAcudienteId) : undefined;
  if (acudienteId !== undefined && (!Number.isInteger(acudienteId) || acudienteId <= 0)) {
    return NextResponse.json({ error: 'Acudiente no válido' }, { status: 400 });
  }

  const result = await listarNotificaciones(acudienteId);
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await crearNotificacionManual({
    acudienteId: Number(body.acudienteId),
    asunto: String(body.asunto || ''),
    mensaje: String(body.mensaje || ''),
    canal: String(body.canal || 'app'),
  }, auth.usuario);

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: result.status });
}
