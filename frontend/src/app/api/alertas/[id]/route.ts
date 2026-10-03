import { NextRequest, NextResponse } from 'next/server';
import { actuarSobreAlerta, escalarAlerta, marcarAlerta, obtenerDetalleAlerta } from '@backend/services/alertas.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;
  const { id } = await params;
  const alertaId = Number(id);
  if (!Number.isInteger(alertaId) || alertaId <= 0) return NextResponse.json({ error: 'Alerta no válida' }, { status: 400 });
  const result = await obtenerDetalleAlerta(alertaId, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'private, no-store' } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const alertaId = Number(id);
  const body = await req.json().catch(() => null);

  if (!Number.isInteger(alertaId) || alertaId <= 0) {
    return NextResponse.json({ error: 'Alerta no válida' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const allowedActions = new Set(['review', 'confirm', 'correct', 'dismiss', 'close', 'regenerate']);
  const action = String(body.accion || '');
  const result = action === 'escalar'
    ? await escalarAlerta(alertaId, auth.usuario)
    : allowedActions.has(action)
      ? await actuarSobreAlerta(alertaId, action as 'review' | 'confirm' | 'correct' | 'dismiss' | 'close' | 'regenerate', body.nota ? String(body.nota) : undefined, auth.usuario)
    : await marcarAlerta(
        alertaId,
        String(body.estado || ''),
        body.notas ? String(body.notas) : undefined,
        auth.usuario
      );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
