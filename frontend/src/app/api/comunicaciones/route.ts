import { NextRequest, NextResponse } from 'next/server';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { crearComunicacion, listarComunicaciones } from '@backend/services/comunicaciones.service';

export async function GET() {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;
  const result = await listarComunicaciones(auth.usuario);
  return NextResponse.json(result.data);
}

export async function POST(request: NextRequest) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > 21 * 1024 * 1024) {
    return NextResponse.json({ error: 'El formulario excede el tamaño permitido.' }, { status: 413 });
  }
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Formulario inválido.' }, { status: 400 });
  const archivos = form.getAll('archivos').filter((item): item is File => item instanceof File);
  if (archivos.length > 5 || archivos.some((archivo) => !archivo.size || archivo.size > 4 * 1024 * 1024)) {
    return NextResponse.json({ error: 'Adjunta hasta cinco archivos de máximo 4 MB cada uno.' }, { status: 400 });
  }
  const contenidoArchivos = await Promise.all(archivos.map(async (archivo) => ({
    nombre: archivo.name,
    mimeType: archivo.type,
    tamano: archivo.size,
    contenido: new Uint8Array(await archivo.arrayBuffer()),
  })));
  const result = await crearComunicacion({
    titulo: String(form.get('titulo') || ''),
    tipo: String(form.get('tipo') || ''),
    destinatarios: String(form.get('destinatarios') || ''),
    contenido: String(form.get('contenido') || ''),
    estado: String(form.get('estado') || ''),
    archivos: contenidoArchivos,
  }, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: result.status });
}
