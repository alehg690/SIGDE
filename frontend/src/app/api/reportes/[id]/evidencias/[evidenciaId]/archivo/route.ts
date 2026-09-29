import { NextResponse } from 'next/server';
import { obtenerArchivoEvidencia } from '@backend/services/reportes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = { params: Promise<{ id: string; evidenciaId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;
  const { id, evidenciaId } = await params;
  const reporteId = Number(id);
  const archivoId = Number(evidenciaId);
  if (!Number.isSafeInteger(reporteId) || reporteId <= 0 || !Number.isSafeInteger(archivoId) || archivoId <= 0) {
    return NextResponse.json({ error: 'Archivo no válido' }, { status: 400 });
  }
  const result = await obtenerArchivoEvidencia(reporteId, archivoId, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return new NextResponse(new Uint8Array(result.data.contenido), {
    headers: {
      'Content-Type': result.data.mimeType,
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.data.nombre)}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
