import { NextResponse } from 'next/server';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { obtenerArchivoComunicacion } from '@backend/services/comunicaciones.service';

type Params = { params: Promise<{ id: string; archivoId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;
  const { id: rawId, archivoId: rawArchivoId } = await params;
  const id = Number(rawId);
  const archivoId = Number(rawArchivoId);
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(archivoId) || archivoId <= 0) return NextResponse.json({ error: 'Archivo inválido.' }, { status: 400 });
  const result = await obtenerArchivoComunicacion(id, archivoId, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return new NextResponse(result.data.contenido, {
    headers: {
      'Content-Type': result.data.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.data.nombre)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
