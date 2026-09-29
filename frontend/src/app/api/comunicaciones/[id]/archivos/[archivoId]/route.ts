import { NextResponse } from 'next/server';
import { db } from '@backend/config/database';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = { params: Promise<{ id: string; archivoId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;
  const { id: rawId, archivoId: rawArchivoId } = await params;
  const id = Number(rawId);
  const archivoId = Number(rawArchivoId);
  if (!Number.isSafeInteger(id) || id <= 0 || !Number.isSafeInteger(archivoId) || archivoId <= 0) return NextResponse.json({ error: 'Archivo inválido.' }, { status: 400 });
  const result = await db.execute({
    sql: `SELECT a.nombre, a.mimeType, a.contenido FROM ComunicacionArchivo a JOIN Comunicacion c ON c.id = a.comunicacionId
      WHERE a.id = ? AND c.id = ? AND (c.estado = 'Publicado' OR c.autorId = ? OR ? IN ('Coordinador', 'Admin')) LIMIT 1`,
    args: [archivoId, id, auth.usuario.id, auth.usuario.rol],
  });
  const file = result.rows[0];
  if (!file || !(file.contenido instanceof Uint8Array)) return NextResponse.json({ error: 'Archivo no encontrado.' }, { status: 404 });
  return new NextResponse(new Uint8Array(file.contenido), {
    headers: {
      'Content-Type': String(file.mimeType),
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(String(file.nombre))}`,
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
