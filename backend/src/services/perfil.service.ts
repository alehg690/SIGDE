import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import type { SesionUsuario } from '@backend/types/roles';

export async function actualizarPerfil(nombre: string, usuario: SesionUsuario) {
  const limpio = nombre.trim();
  if (limpio.length < 3 || limpio.length > 120) return { error: 'El nombre debe tener entre 3 y 120 caracteres.', status: 400 };
  // La identidad y el rol provienen exclusivamente de la sesión verificada.
  const result = await db.execute({ sql: 'UPDATE Usuario SET nombre = ? WHERE id = ? AND activo = 1 RETURNING id, nombre, correo, rol', args: [limpio, usuario.id] });
  if (!result.rows.length) return { error: 'La cuenta no está disponible.', status: 404 };
  await registrarAccion({ usuarioId: usuario.id, accion: 'actualizar_perfil', entidad: 'Usuario', entidadId: usuario.id, detalle: { nombre: limpio } });
  return { data: result.rows[0], status: 200 };
}
