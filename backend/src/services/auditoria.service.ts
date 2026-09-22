import { db } from '@backend/config/database';

export type AuditoriaInput = {
  usuarioId: number;
  accion: string;
  entidad: string;
  entidadId?: string | number | null;
  detalle?: unknown;
};

export async function registrarAccion(input: AuditoriaInput) {
  await db.execute({
    sql: `
      INSERT INTO AuditLog (usuarioId, accion, entidad, entidadId, detalle)
      VALUES (?, ?, ?, ?, ?)
    `,
    args: [
      input.usuarioId,
      input.accion,
      input.entidad,
      input.entidadId == null ? null : String(input.entidadId),
      input.detalle == null ? null : JSON.stringify(input.detalle),
    ],
  });
}

export async function consultarLogs() {
  const result = await db.execute(`
    SELECT a.id, a.usuarioId, COALESCE(u.nombre, a.usuarioNombre, 'Usuario eliminado') AS usuario, a.accion, a.entidad, a.entidadId, a.detalle, a.creadoEn
    FROM AuditLog a
    LEFT JOIN Usuario u ON u.id = a.usuarioId
    ORDER BY a.creadoEn DESC
    LIMIT 200
  `);

  return { data: result.rows };
}
