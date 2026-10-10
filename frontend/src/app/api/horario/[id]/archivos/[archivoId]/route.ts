import { NextResponse } from 'next/server';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { obtenerArchivoHorario } from '@backend/services/horario.service';

type Params = { params: Promise<{ id: string; archivoId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requerirSesion();
  if (esErrorAuth(auth)) return auth.response;
  const values = await params;
  const horarioId = Number(values.id);
  const archivoId = Number(values.archivoId);
  if (!Number.isSafeInteger(horarioId) || !Number.isSafeInteger(archivoId) || horarioId <= 0 || archivoId <= 0) {
    return NextResponse.json({ error: 'Archivo inválido.' }, { status: 400 });
  }
  const result = await obtenerArchivoHorario(horarioId, archivoId);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return new NextResponse(Buffer.from(result.data.contenido), {
    headers: {
      'Content-Type': result.data.mimeType,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(result.data.nombre)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
