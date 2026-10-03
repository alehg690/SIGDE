import { NextResponse } from 'next/server';
import { listarAlertas } from '@backend/services/alertas.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET(request: Request) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const params = new URL(request.url).searchParams;
  const result = await listarAlertas(auth.usuario, {
    historial: params.get('historial') === '1',
    busqueda: params.get('buscar') || undefined,
    estado: params.get('estado') || undefined,
    nivel: params.get('nivel') || undefined,
    regla: params.get('regla') || undefined,
    curso: params.get('curso') || undefined,
    desde: params.get('desde') || undefined,
    hasta: params.get('hasta') || undefined,
  });
  return NextResponse.json(result.data, { headers: { 'Cache-Control': 'private, no-store' } });
}
