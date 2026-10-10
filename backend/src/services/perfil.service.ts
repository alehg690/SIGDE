import { db } from '@backend/config/database';
import { registrarAccion } from '@backend/services/auditoria.service';
import { hashPassword, validarContrasenaSegura, verificarPassword } from '@backend/services/auth.service';
import { consultarLimite, crearClaveLimite, LIMITES_AUTH, limpiarLimite, registrarIntento } from '@backend/services/auth-rate-limit.service';
import type { SesionUsuario } from '@backend/types/roles';

export async function actualizarPerfil(nombre: string, usuario: SesionUsuario) {
  const limpio = nombre.trim();
  if (limpio.length < 3 || limpio.length > 120) return { error: 'El nombre debe tener entre 3 y 120 caracteres.', status: 400 };
  const result = await db.execute({ sql: 'UPDATE Usuario SET nombre = ? WHERE id = ? AND activo = 1 RETURNING id, nombre, correo, rol', args: [limpio, usuario.id] });
  if (!result.rows.length) return { error: 'La cuenta no está disponible.', status: 404 };
  await registrarAccion({ usuarioId: usuario.id, accion: 'actualizar_perfil', entidad: 'Usuario', entidadId: usuario.id, detalle: { nombre: limpio } });
  return { data: result.rows[0], status: 200 };
}

export async function cambiarContrasenaPerfil(contrasenaActual: string, nuevaContrasena: string, usuario: SesionUsuario) {
  const claveLimite = crearClaveLimite('cambio-perfil', String(usuario.id));
  const limite = await consultarLimite(claveLimite);
  if (limite.bloqueado) {
    return { error: `Demasiados intentos. Inténtalo nuevamente en ${Math.max(1, limite.reintentarEnSegundos)} segundos.`, status: 429 };
  }

  const errorContrasena = validarContrasenaSegura(nuevaContrasena);
  if (errorContrasena) return { error: errorContrasena, status: 400 };

  const result = await db.execute({
    sql: 'SELECT contrasena, versionSesion FROM Usuario WHERE id = ? AND activo = 1 AND eliminadoEn IS NULL LIMIT 1',
    args: [usuario.id],
  });
  const cuenta = result.rows[0];
  if (!cuenta) return { error: 'La cuenta no está disponible.', status: 404 };

  if (!await verificarPassword(contrasenaActual, String(cuenta.contrasena))) {
    const fallo = await registrarIntento(claveLimite, 'cambio-perfil', LIMITES_AUTH.loginCuenta);
    if (fallo.bloqueado) {
      return { error: `Demasiados intentos. Inténtalo nuevamente en ${Math.max(1, fallo.reintentarEnSegundos)} segundos.`, status: 429 };
    }
    return { error: 'La contraseña actual es incorrecta.', status: 400 };
  }
  if (await verificarPassword(nuevaContrasena, String(cuenta.contrasena))) {
    return { error: 'La nueva contraseña debe ser diferente de la actual.', status: 400 };
  }

  const versionSesion = Number(cuenta.versionSesion || usuario.versionSesion);
  const hash = await hashPassword(nuevaContrasena);
  await db.batch([
    {
      sql: `UPDATE Usuario SET contrasena = ?, tokenRecuperacion = NULL, tokenExpira = NULL,
        requiereCambioContrasena = 0, versionSesion = versionSesion + 1
        WHERE id = ? AND activo = 1 AND eliminadoEn IS NULL`,
      args: [hash, usuario.id],
    },
    {
      sql: 'INSERT INTO AuditLog (usuarioId, accion, entidad, entidadId, detalle) VALUES (?, ?, ?, ?, ?)',
      args: [usuario.id, 'cambiar_contrasena_perfil', 'Usuario', String(usuario.id), JSON.stringify({ sesionesAnterioresRevocadas: true })],
    },
  ], 'write');

  await limpiarLimite(claveLimite);
  return { data: { mensaje: 'Contraseña actualizada correctamente.', versionSesion: versionSesion + 1 }, status: 200 };
}

export async function cerrarOtrasSesiones(usuario: SesionUsuario) {
  await db.batch([
    {
      sql: `UPDATE Usuario SET versionSesion = versionSesion + 1
        WHERE id = ? AND activo = 1 AND eliminadoEn IS NULL`,
      args: [usuario.id],
    },
    {
      sql: 'INSERT INTO AuditLog (usuarioId, accion, entidad, entidadId, detalle) VALUES (?, ?, ?, ?, ?)',
      args: [usuario.id, 'cerrar_otras_sesiones', 'Usuario', String(usuario.id), JSON.stringify({ sesionesAnterioresRevocadas: true })],
    },
  ], 'write');
  return { data: { mensaje: 'Las demás sesiones se cerraron correctamente.', versionSesion: usuario.versionSesion + 1 }, status: 200 };
}
