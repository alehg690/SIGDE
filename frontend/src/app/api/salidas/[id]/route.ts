import { NextRequest, NextResponse } from 'next/server';
import { firmarSalida } from '@backend/services/salidas.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Porteria']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (!id.trim()) return NextResponse.json({ error: 'Salida no válida' }, { status: 400 });
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await firmarSalida(id, String(body.firma || ''), auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
