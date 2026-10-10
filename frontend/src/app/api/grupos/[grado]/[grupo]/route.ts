import { NextRequest, NextResponse } from 'next/server';
import { actualizarDirectorGrupo } from '@backend/services/grupos.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = {
  params: Promise<{ grado: string; grupo: string }>;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const { grado, grupo } = await params;
  const body = await req.json().catch(() => null);
  if (!body || (body.directorId !== null && (!Number.isInteger(body.directorId) || body.directorId <= 0))) {
    return NextResponse.json({ error: 'Selecciona un director de grupo válido' }, { status: 400 });
  }

  const result = await actualizarDirectorGrupo(grado, grupo, body.directorId, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
