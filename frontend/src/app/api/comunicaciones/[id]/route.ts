import { NextResponse } from 'next/server';
import { db } from '@backend/config/database';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Comunicación inválida.' }, { status: 400 });
  const result = await db.execute({
    sql: `SELECT c.id, c.titulo, c.tipo, c.destinatarios, c.contenido, c.estado, c.autorId, c.creadoEn, c.publicadoEn, c.visualizaciones, u.nombre AS autor
      FROM Comunicacion c JOIN Usuario u ON u.id = c.autorId WHERE c.id = ? AND (c.estado = 'Publicado' OR c.autorId = ? OR ? IN ('Coordinador', 'Admin')) LIMIT 1`,
    args: [id, auth.usuario.id, auth.usuario.rol],
  });
  const comunicacion = result.rows[0];
  if (!comunicacion) return NextResponse.json({ error: 'Comunicación no encontrada.' }, { status: 404 });
  const [archivos] = await Promise.all([
    db.execute({ sql: 'SELECT id, nombre, mimeType, tamano FROM ComunicacionArchivo WHERE comunicacionId = ? ORDER BY id', args: [id] }),
    comunicacion.estado === 'Publicado'
      ? db.execute({ sql: 'UPDATE Comunicacion SET visualizaciones = visualizaciones + 1 WHERE id = ?', args: [id] })
      : Promise.resolve(),
  ]);
  if (comunicacion.estado === 'Publicado') comunicacion.visualizaciones = Number(comunicacion.visualizaciones) + 1;
  return NextResponse.json({ ...comunicacion, archivos: archivos.rows });
}

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0) return NextResponse.json({ error: 'Comunicación inválida.' }, { status: 400 });
  const result = await db.execute({ sql: "UPDATE Comunicacion SET estado = 'Publicado', publicadoEn = ? WHERE id = ? AND estado = 'Borrador' RETURNING id", args: [new Date().toISOString(), id] });
  if (!result.rows.length) return NextResponse.json({ error: 'Borrador no encontrado.' }, { status: 404 });
  return NextResponse.json({ id });
}
