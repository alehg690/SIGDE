import { NextResponse } from 'next/server';
import { listarGrupos } from '@backend/services/grupos.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarGrupos();
  return NextResponse.json(result.data);
}
