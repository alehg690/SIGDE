import { NextRequest, NextResponse } from 'next/server';
import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { GRUPOS_ACADEMICOS } from '@/lib/academic-groups';

const TIPOS = ['Circular', 'Comunicado', 'Aviso', 'Citación'];
const DESTINATARIOS = ['Toda la comunidad', 'Solo docentes', 'Solo estudiantes', ...GRUPOS_ACADEMICOS.map((grupo) => grupo.etiqueta)];
const MIME = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

export async function GET() {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;
  const result = await db.execute({
    sql: `SELECT c.id, c.titulo, c.tipo, c.destinatarios, c.contenido, c.estado, c.autorId, c.creadoEn, c.publicadoEn, c.visualizaciones, u.nombre AS autor,
      (SELECT COUNT(*) FROM ComunicacionArchivo a WHERE a.comunicacionId = c.id) AS archivosCantidad
      FROM Comunicacion c JOIN Usuario u ON u.id = c.autorId
      WHERE c.estado = 'Publicado' OR (c.estado = 'Borrador' AND (c.autorId = ? OR ? IN ('Coordinador', 'Admin')))
      ORDER BY CASE WHEN c.estado = 'Publicado' THEN c.publicadoEn ELSE c.creadoEn END DESC, c.id DESC LIMIT 300`,
    args: [auth.usuario.id, auth.usuario.rol],
  });
  return NextResponse.json(result.rows);
}

export async function POST(request: NextRequest) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Formulario inválido.' }, { status: 400 });
  const titulo = String(form.get('titulo') || '').trim();
  const tipo = String(form.get('tipo') || '');
  const destinatarios = String(form.get('destinatarios') || '');
  const contenido = String(form.get('contenido') || '').trim();
  const estado = String(form.get('estado') || '');
  const archivos = form.getAll('archivos').filter((item): item is File => item instanceof File);
  if (!titulo || titulo.length > 160 || contenido.length > 10000 || (estado === 'Publicado' && !contenido)) {
    return NextResponse.json({ error: 'Completa el título y el contenido sin exceder los límites.' }, { status: 400 });
  }
  if (!TIPOS.includes(tipo) || !DESTINATARIOS.includes(destinatarios) || !['Borrador', 'Publicado'].includes(estado)) {
    return NextResponse.json({ error: 'Tipo, destinatarios o estado inválidos.' }, { status: 400 });
  }
  if (archivos.length > 5 || archivos.some((file) => !file.size || file.size > 4 * 1024 * 1024 || !MIME.includes(file.type) || file.name.length > 160)) {
    return NextResponse.json({ error: 'Adjunta hasta cinco archivos PDF, DOCX o imágenes de máximo 4 MB cada uno.' }, { status: 400 });
  }
  const contenidos = await Promise.all(archivos.map(async (file) => new Uint8Array(await file.arrayBuffer())));
  const transaction = await db.transaction('write');
  let id: number;
  try {
    const inserted = await transaction.execute({
      sql: `INSERT INTO Comunicacion (titulo, tipo, destinatarios, contenido, estado, autorId, publicadoEn)
        VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [titulo, tipo, destinatarios, contenido, estado, auth.usuario.id, estado === 'Publicado' ? new Date().toISOString() : null],
    });
    id = Number(inserted.rows[0].id);
    for (let index = 0; index < archivos.length; index += 1) {
      const file = archivos[index];
      await transaction.execute({
        sql: 'INSERT INTO ComunicacionArchivo (comunicacionId, nombre, mimeType, tamano, contenido) VALUES (?, ?, ?, ?, ?)',
        args: [id, file.name, file.type, file.size, contenidos[index]],
      });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  await registrarAccion({ usuarioId: auth.usuario.id, accion: estado === 'Publicado' ? 'publicar_comunicacion' : 'guardar_borrador_comunicacion', entidad: 'Comunicacion', entidadId: id, detalle: { titulo, tipo, destinatarios, archivos: archivos.length } });
  return NextResponse.json({ id }, { status: 201 });
}
