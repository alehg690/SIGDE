import { NextRequest, NextResponse } from 'next/server';
import { adjuntarEvidenciaConvivencia, obtenerEvidenciaConvivencia } from '@backend/services/reportes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;
  const id = (await params).id.trim();
  if (!id) return NextResponse.json({ error: 'Proceso de convivencia no válido' }, { status: 400 });
  const contentLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > 5 * 1024 * 1024) return NextResponse.json({ error: 'El formulario excede el tamaño permitido' }, { status: 413 });
  const form = await req.formData().catch(() => null);
  const file = form?.get('archivo');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Selecciona un archivo' }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'El archivo no puede superar 4 MB' }, { status: 400 });
  const result = await adjuntarEvidenciaConvivencia(id, { nombre: file.name, mimeType: file.type, contenido: new Uint8Array(await file.arrayBuffer()) }, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: result.status });
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;
  const id = (await params).id.trim();
  if (!id) return NextResponse.json({ error: 'Proceso de convivencia no válido' }, { status: 400 });
  const result = await obtenerEvidenciaConvivencia(id);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return new NextResponse(new Uint8Array(result.data.contenido), { headers: {
    'Content-Type': result.data.mimeType,
    'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(result.data.nombre)}`,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}
