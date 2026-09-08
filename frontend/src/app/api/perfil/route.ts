import { NextRequest, NextResponse } from 'next/server';
import { actualizarPerfil } from '@backend/services/perfil.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function PATCH(request: NextRequest) {
  const auth = await requerirSesion();
  if (esErrorAuth(auth)) return auth.response;
  const body = await request.json().catch(() => null);
  if (typeof body?.nombre !== 'string') return NextResponse.json({ error: 'Ingresa un nombre válido.' }, { status: 400 });
  const result = await actualizarPerfil(body.nombre, auth.usuario);
  return NextResponse.json('error' in result ? { error: result.error } : result.data, { status: result.status });
}
