import { NextRequest, NextResponse } from 'next/server';
import { escalarAlerta, marcarAlerta } from '@backend/services/alertas.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const alertaId = Number(id);
  const body = await req.json().catch(() => null);

  if (!Number.isInteger(alertaId) || alertaId <= 0) {
    return NextResponse.json({ error: 'Alerta no válida' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = body.accion === 'escalar'
    ? await escalarAlerta(alertaId, auth.usuario)
    : await marcarAlerta(
        alertaId,
        String(body.estado || ''),
        body.notas ? String(body.notas) : undefined,
        auth.usuario
      );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
