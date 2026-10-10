import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';
import { contenidoBinario, firmaArchivoValida, nombreArchivoSeguro } from '@backend/utils/uploads';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const ALLOWED_MIME = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', XLSX_MIME,
]);

export type ArchivoHorarioInput = {
  nombre: string;
  mimeType: string;
  tamano: number;
  contenido: Uint8Array;
};

function validFile(file: ArchivoHorarioInput) {
  const zipFile = file.mimeType === XLSX_MIME
    && file.contenido[0] === 0x50 && file.contenido[1] === 0x4b && file.contenido[2] === 0x03 && file.contenido[3] === 0x04;
  return file.tamano > 0 && file.tamano <= 4 * 1024 * 1024
    && file.contenido.byteLength === file.tamano
    && ALLOWED_MIME.has(file.mimeType)
    && Boolean(nombreArchivoSeguro(file.nombre, 160))
    && (zipFile || firmaArchivoValida(file.contenido, file.mimeType));
}

export async function actualizarHorarioDesdeGmail(input: {
  titulo: string;
  contenido: string;
  periodo?: string | null;
  messageId: string;
  archivos: ArchivoHorarioInput[];
}, usuario: SesionUsuario) {
  const titulo = input.titulo.trim().slice(0, 160);
  const contenido = input.contenido.trim().slice(0, 10_000);
  const archivos = input.archivos.filter(validFile).slice(0, 5);
  if (!titulo || (!contenido && archivos.length === 0)) throw new Error('El correo de horario no contiene información publicable.');

  const transaction = await db.transaction('write');
  let id: number;
  try {
    await transaction.execute('UPDATE HorarioInstitucional SET activo = 0 WHERE activo = 1');
    const inserted = await transaction.execute({
      sql: `INSERT INTO HorarioInstitucional (titulo, contenido, periodo, activo, origenMessageId, actualizadoPorId)
        VALUES (?, ?, ?, 1, ?, ?) RETURNING id`,
      args: [titulo, contenido, input.periodo || null, input.messageId, usuario.id],
    });
    id = Number(inserted.rows[0].id);
    for (const file of archivos) {
      await transaction.execute({
        sql: 'INSERT INTO HorarioInstitucionalArchivo (horarioId, nombre, mimeType, tamano, contenido) VALUES (?, ?, ?, ?, ?)',
        args: [id, nombreArchivoSeguro(file.nombre, 160)!, file.mimeType, file.tamano, file.contenido],
      });
    }
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
  await registrarAccion({
    usuarioId: usuario.id,
    accion: 'actualizar_horario_desde_gmail',
    entidad: 'HorarioInstitucional',
    entidadId: id,
    detalle: { titulo, periodo: input.periodo || null, archivos: archivos.length, messageId: input.messageId },
  });
  return { id };
}

export async function obtenerHorarioInstitucional(incluirHistorial: boolean) {
  const result = await db.execute(`
    SELECT h.id, h.titulo, h.contenido, h.periodo, h.activo, h.creadoEn, u.nombre AS actualizadoPor,
      (SELECT COUNT(*) FROM HorarioInstitucionalArchivo a WHERE a.horarioId = h.id) AS archivosCantidad
    FROM HorarioInstitucional h JOIN Usuario u ON u.id = h.actualizadoPorId
    ${incluirHistorial ? '' : 'WHERE h.activo = 1'}
    ORDER BY h.activo DESC, datetime(h.creadoEn) DESC LIMIT ${incluirHistorial ? 20 : 1}
  `);
  if (!result.rows.length) return { data: { actual: null, historial: [] } };
  const actualRow = result.rows.find((row) => Boolean(row.activo)) || null;
  let actual = null;
  if (actualRow) {
    const files = await db.execute({
      sql: 'SELECT id, nombre, mimeType, tamano FROM HorarioInstitucionalArchivo WHERE horarioId = ? ORDER BY id',
      args: [actualRow.id],
    });
    actual = { ...actualRow, archivos: files.rows };
  }
  return { data: { actual, historial: incluirHistorial ? result.rows.filter((row) => !row.activo) : [] } };
}

export async function obtenerArchivoHorario(horarioId: number, archivoId: number) {
  const result = await db.execute({
    sql: `SELECT a.nombre, a.mimeType, a.contenido FROM HorarioInstitucionalArchivo a
      JOIN HorarioInstitucional h ON h.id = a.horarioId WHERE a.id = ? AND h.id = ? LIMIT 1`,
    args: [archivoId, horarioId],
  });
  const file = result.rows[0];
  const content = contenidoBinario(file?.contenido);
  if (!file || !content) return { error: 'Archivo no encontrado.', status: 404 } as const;
  return { data: { nombre: String(file.nombre), mimeType: String(file.mimeType), contenido: content } } as const;
}
