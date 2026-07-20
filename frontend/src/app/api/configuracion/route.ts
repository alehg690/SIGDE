import { NextRequest, NextResponse } from 'next/server';
import { actualizarConfiguracion, obtenerConfiguracion } from '@backend/services/configuracion.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Admin']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await obtenerConfiguracion();
  return NextResponse.json(result.data);
}

export async function PUT(req: NextRequest) {
  const auth = await requerirSesion(['Admin']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await actualizarConfiguracion(
    String(body.clave || ''),
    String(body.valor || ''),
    auth.usuario
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
