import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';
import { GRUPOS_ACADEMICOS } from '@/lib/academic-groups';
import { contenidoBinario, firmaArchivoValida, nombreArchivoSeguro } from '@backend/utils/uploads';

const TIPOS = new Set(['Circular', 'Comunicado', 'Aviso', 'Citación']);
const DESTINATARIOS = new Set([
  'Toda la comunidad',
  'Solo docentes',
  'Solo estudiantes',
  ...GRUPOS_ACADEMICOS.map((grupo) => grupo.etiqueta),
]);
const ESTADOS = new Set(['Borrador', 'Publicado']);
const MIME_PERMITIDOS = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const MAX_ARCHIVOS = 5;
const MAX_ARCHIVO_BYTES = 4 * 1024 * 1024;

export type ArchivoComunicacionInput = {
  nombre: string;
  mimeType: string;
  tamano: number;
  contenido: Uint8Array;
};

export type ComunicacionInput = {
  titulo: string;
  tipo: string;
  destinatarios: string;
  contenido: string;
  estado: string;
  archivos: ArchivoComunicacionInput[];
};

function validarComunicacion(input: ComunicacionInput) {
  const titulo = input.titulo.trim();
  const contenido = input.contenido.trim();
  if (!titulo || titulo.length > 160 || contenido.length > 10_000 || (input.estado === 'Publicado' && !contenido)) {
    return { error: 'Completa el título y el contenido sin exceder los límites.', status: 400 } as const;
  }
  if (!TIPOS.has(input.tipo) || !DESTINATARIOS.has(input.destinatarios) || !ESTADOS.has(input.estado)) {
    return { error: 'Tipo, destinatarios o estado inválidos.', status: 400 } as const;
  }
  if (input.archivos.length > MAX_ARCHIVOS || input.archivos.some((archivo) => (
    !archivo.tamano
    || archivo.tamano > MAX_ARCHIVO_BYTES
    || archivo.contenido.byteLength !== archivo.tamano
    || !MIME_PERMITIDOS.has(archivo.mimeType)
    || !archivo.nombre
    || archivo.nombre.length > 160
    || !nombreArchivoSeguro(archivo.nombre, 160)
    || !firmaArchivoValida(archivo.contenido, archivo.mimeType)
  ))) {
    return { error: 'Adjunta hasta cinco archivos PDF, DOCX o imágenes de máximo 4 MB cada uno.', status: 400 } as const;
  }
  return { data: { ...input, titulo, contenido } } as const;
}

export async function listarComunicaciones(usuario: SesionUsuario) {
  const result = await db.execute({
    sql: `SELECT c.id, c.titulo, c.tipo, c.destinatarios, c.contenido, c.estado, c.autorId, c.creadoEn, c.publicadoEn, c.visualizaciones, u.nombre AS autor,
      (SELECT COUNT(*) FROM ComunicacionArchivo a WHERE a.comunicacionId = c.id) AS archivosCantidad
      FROM Comunicacion c JOIN Usuario u ON u.id = c.autorId
      WHERE c.estado = 'Publicado' OR (c.estado = 'Borrador' AND (c.autorId = ? OR ? IN ('Coordinador', 'Admin')))
      ORDER BY CASE WHEN c.estado = 'Publicado' THEN c.publicadoEn ELSE c.creadoEn END DESC, c.id DESC LIMIT 300`,
    args: [usuario.id, usuario.rol],
  });
  return { data: result.rows };
}

export async function crearComunicacion(input: ComunicacionInput, usuario: SesionUsuario) {
  const validacion = validarComunicacion(input);
  if ('error' in validacion) return validacion;
  const data = validacion.data;
  const transaction = await db.transaction('write');
  let id: number;
  try {
    const inserted = await transaction.execute({
      sql: `INSERT INTO Comunicacion (titulo, tipo, destinatarios, contenido, estado, autorId, publicadoEn)
        VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      args: [data.titulo, data.tipo, data.destinatarios, data.contenido, data.estado, usuario.id, data.estado === 'Publicado' ? new Date().toISOString() : null],
    });
    id = Number(inserted.rows[0].id);
    for (const archivo of data.archivos) {
      await transaction.execute({
        sql: 'INSERT INTO ComunicacionArchivo (comunicacionId, nombre, mimeType, tamano, contenido) VALUES (?, ?, ?, ?, ?)',
        args: [id, nombreArchivoSeguro(archivo.nombre, 160)!, archivo.mimeType, archivo.tamano, archivo.contenido],
      });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  await registrarAccion({
    usuarioId: usuario.id,
    accion: data.estado === 'Publicado' ? 'publicar_comunicacion' : 'guardar_borrador_comunicacion',
    entidad: 'Comunicacion',
    entidadId: id,
    detalle: { titulo: data.titulo, tipo: data.tipo, destinatarios: data.destinatarios, archivos: data.archivos.length },
  });
  return { data: { id }, status: 201 } as const;
}

export async function obtenerComunicacion(id: number, usuario: SesionUsuario) {
  const result = await db.execute({
    sql: `SELECT c.id, c.titulo, c.tipo, c.destinatarios, c.contenido, c.estado, c.autorId, c.creadoEn, c.publicadoEn, c.visualizaciones, u.nombre AS autor
      FROM Comunicacion c JOIN Usuario u ON u.id = c.autorId
      WHERE c.id = ? AND (c.estado = 'Publicado' OR c.autorId = ? OR ? IN ('Coordinador', 'Admin')) LIMIT 1`,
    args: [id, usuario.id, usuario.rol],
  });
  const comunicacion = result.rows[0];
  if (!comunicacion) return { error: 'Comunicación no encontrada.', status: 404 } as const;
  const archivos = await db.execute({
    sql: 'SELECT id, nombre, mimeType, tamano FROM ComunicacionArchivo WHERE comunicacionId = ? ORDER BY id',
    args: [id],
  });
  if (comunicacion.estado === 'Publicado') {
    await db.execute({ sql: 'UPDATE Comunicacion SET visualizaciones = visualizaciones + 1 WHERE id = ?', args: [id] });
    comunicacion.visualizaciones = Number(comunicacion.visualizaciones) + 1;
  }
  return { data: { ...comunicacion, archivos: archivos.rows } };
}

export async function publicarComunicacion(id: number, usuario: SesionUsuario) {
  const result = await db.execute({
    sql: "UPDATE Comunicacion SET estado = 'Publicado', publicadoEn = ? WHERE id = ? AND estado = 'Borrador' RETURNING id, titulo",
    args: [new Date().toISOString(), id],
  });
  const comunicacion = result.rows[0];
  if (!comunicacion) return { error: 'Borrador no encontrado.', status: 404 } as const;
  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'publicar_comunicacion',
    entidad: 'Comunicacion',
    entidadId: id,
    detalle: { titulo: comunicacion.titulo },
  });
  return { data: { id } };
}

export async function obtenerArchivoComunicacion(
  comunicacionId: number,
  archivoId: number,
  usuario: SesionUsuario
) {
  const result = await db.execute({
    sql: `SELECT a.nombre, a.mimeType, a.contenido FROM ComunicacionArchivo a
      JOIN Comunicacion c ON c.id = a.comunicacionId
      WHERE a.id = ? AND c.id = ? AND (c.estado = 'Publicado' OR c.autorId = ? OR ? IN ('Coordinador', 'Admin')) LIMIT 1`,
    args: [archivoId, comunicacionId, usuario.id, usuario.rol],
  });
  const archivo = result.rows[0];
  const contenido = contenidoBinario(archivo?.contenido);
  if (!archivo || !contenido) {
    return { error: 'Archivo no encontrado.', status: 404 } as const;
  }
  return {
    data: {
      nombre: String(archivo.nombre),
      mimeType: String(archivo.mimeType),
      contenido,
    },
  };
}
