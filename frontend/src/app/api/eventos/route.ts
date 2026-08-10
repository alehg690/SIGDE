import { NextRequest, NextResponse } from 'next/server';
import { crearEvento, listarEventosProximos } from '@backend/services/eventos.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion();
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarEventosProximos();
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });

  const result = await crearEvento({
    titulo: String(body.titulo || ''),
    iniciaEn: String(body.iniciaEn || ''),
    descripcion: body.descripcion ? String(body.descripcion) : undefined,
    ubicacion: body.ubicacion ? String(body.ubicacion) : undefined,
  }, auth.usuario);

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: result.status });
}
