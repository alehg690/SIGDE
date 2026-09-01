import { db } from '@backend/config/database';
import { hashPassword, validarContrasenaSegura } from '@backend/services/auth.service';
import { registrarAccion } from '@backend/services/auditoria.service';
import { normalizarRol, type RolUsuario, type SesionUsuario } from '@backend/types/roles';

type UsuarioRow = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: number;
  creadoEn: string;
  ultimoAcceso: string | null;
};

export type UsuarioInput = {
  nombre: string;
  correo: string;
  rol: string;
  contrasena?: string;
  activo?: boolean;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mapUsuario(row: UsuarioRow) {
  return {
    id: row.id,
    nombre: row.nombre,
    correo: row.correo,
    rol: row.rol,
    activo: Boolean(row.activo),
    creadoEn: row.creadoEn,
    ultimoAcceso: row.ultimoAcceso,
  };
}

function validarDatosUsuario(input: UsuarioInput, requiereContrasena: boolean) {
  const nombre = input.nombre.trim();
  const correo = input.correo.trim().toLowerCase();
  const rol = normalizarRol(input.rol);

  if (!nombre) return { error: 'El nombre es obligatorio', status: 400 };
  if (!EMAIL_PATTERN.test(correo)) return { error: 'Ingresa un correo válido', status: 400 };
  if (!rol) return { error: 'Rol no válido', status: 400 };

  if (requiereContrasena || input.contrasena) {
    const contrasena = input.contrasena || '';
    const errorContrasena = validarContrasenaSegura(contrasena);
    if (errorContrasena) return { error: errorContrasena, status: 400 };
  }

  return { data: { nombre, correo, rol } };
}

export async function listarUsuarios() {
  const result = await db.execute(`
    SELECT id, nombre, correo, rol, activo, creadoEn, ultimoAcceso
    FROM Usuario
    ORDER BY id ASC
  `);

  return { data: result.rows.map((row) => mapUsuario(row as unknown as UsuarioRow)) };
}

export async function obtenerUsuarioPorId(id: number) {
  const result = await db.execute({
    sql: 'SELECT id, nombre, correo, rol, activo, creadoEn, ultimoAcceso FROM Usuario WHERE id = ? LIMIT 1',
    args: [id],
  });

  const usuario = result.rows[0] as unknown as UsuarioRow | undefined;
  return usuario ? mapUsuario(usuario) : null;
}

export async function crearUsuario(input: UsuarioInput, actor: SesionUsuario) {
  const validacion = validarDatosUsuario(input, true);
  if ('error' in validacion) return validacion;

  const { nombre, correo, rol } = validacion.data;
  const existente = await db.execute({
    sql: 'SELECT id FROM Usuario WHERE LOWER(correo) = LOWER(?) LIMIT 1',
    args: [correo],
  });

  if (existente.rows.length > 0) {
    return { error: 'Ya existe un usuario con ese correo', status: 409 };
  }

  const contrasenaHash = await hashPassword(input.contrasena || '');
  const activo = input.activo === false ? 0 : 1;

  const result = await db.execute({
    sql: `
      INSERT INTO Usuario (nombre, correo, contrasena, rol, activo)
      VALUES (?, ?, ?, ?, ?)
      RETURNING id, nombre, correo, rol, activo, creadoEn, ultimoAcceso
    `,
    args: [nombre, correo, contrasenaHash, rol, activo],
  });

  const usuario = mapUsuario(result.rows[0] as unknown as UsuarioRow);
  await registrarAccion({ usuarioId: actor.id, accion: 'crear_usuario', entidad: 'Usuario', entidadId: usuario.id, detalle: { rol: usuario.rol } });
  return { data: usuario, status: 201 };
}

export async function actualizarUsuario(id: number, input: UsuarioInput, actor: SesionUsuario) {
  const validacion = validarDatosUsuario(input, false);
  if ('error' in validacion) return validacion;

  const { nombre, correo, rol } = validacion.data;
  if (id === actor.id && rol !== actor.rol) {
    return { error: 'No puedes cambiar el rol de la cuenta con la que estás trabajando', status: 400 };
  }
  if (id === actor.id && input.activo === false) {
    return { error: 'No puedes desactivar la cuenta con la que estás trabajando', status: 400 };
  }
  const existente = await db.execute({
    sql: 'SELECT id FROM Usuario WHERE LOWER(correo) = LOWER(?) AND id <> ? LIMIT 1',
    args: [correo, id],
  });

  if (existente.rows.length > 0) {
    return { error: 'Ya existe otro usuario con ese correo', status: 409 };
  }

  const activo = input.activo === false ? 0 : 1;
  const args: Array<string | number | RolUsuario> = [nombre, correo, rol, activo];
  let setContrasena = '';

  if (input.contrasena) {
    setContrasena = ', contrasena = ?';
    args.push(await hashPassword(input.contrasena));
  }

  args.push(id);

  const result = await db.execute({
    sql: `
      UPDATE Usuario
      SET nombre = ?, correo = ?, rol = ?, activo = ?${setContrasena},
          versionSesion = versionSesion + 1
      WHERE id = ?
      RETURNING id, nombre, correo, rol, activo, creadoEn, ultimoAcceso
    `,
    args,
  });

  if (!result.rows[0]) return { error: 'Usuario no encontrado', status: 404 };
  const usuario = mapUsuario(result.rows[0] as unknown as UsuarioRow);
  await registrarAccion({ usuarioId: actor.id, accion: 'actualizar_usuario', entidad: 'Usuario', entidadId: id, detalle: { rol: usuario.rol, activo: usuario.activo, cambioContrasena: Boolean(input.contrasena) } });
  return { data: usuario };
}

export async function cambiarEstadoUsuario(id: number, activo: boolean, actor: SesionUsuario) {
  if (id === actor.id && !activo) return { error: 'No puedes desactivar la cuenta con la que estás trabajando', status: 400 };
  const result = await db.execute({
    sql: `
      UPDATE Usuario
      SET activo = ?, versionSesion = versionSesion + 1
      WHERE id = ?
      RETURNING id, nombre, correo, rol, activo, creadoEn, ultimoAcceso
    `,
    args: [activo ? 1 : 0, id],
  });

  if (!result.rows[0]) return { error: 'Usuario no encontrado', status: 404 };
  const usuario = mapUsuario(result.rows[0] as unknown as UsuarioRow);
  await registrarAccion({ usuarioId: actor.id, accion: activo ? 'activar_usuario' : 'desactivar_usuario', entidad: 'Usuario', entidadId: id });
  return { data: usuario };
}

export async function eliminarUsuario(id: number, actor: SesionUsuario) {
  if (id === actor.id) return { error: 'No puedes eliminar la cuenta con la que estás trabajando', status: 400 };

  const usuario = await obtenerUsuarioPorId(id);
  if (!usuario) return { error: 'Usuario no encontrado', status: 404 };

  const dependencias = await db.execute({
    sql: `
      SELECT
        (SELECT COUNT(*) FROM Reporte WHERE docenteId = ?) +
        (SELECT COUNT(*) FROM ObservacionReporte WHERE usuarioId = ?) +
        (SELECT COUNT(*) FROM Salida WHERE registradoPorId = ?) +
        (SELECT COUNT(*) FROM AuditLog WHERE usuarioId = ?) AS total
    `,
    args: [id, id, id, id],
  });
  if (Number(dependencias.rows[0]?.total || 0) > 0) {
    return { error: 'Este usuario tiene historial institucional y no puede eliminarse. Desactívalo para conservar la trazabilidad.', status: 409 };
  }

  await db.execute({ sql: 'DELETE FROM Usuario WHERE id = ?', args: [id] });
  await registrarAccion({ usuarioId: actor.id, accion: 'eliminar_usuario', entidad: 'Usuario', entidadId: id, detalle: { nombre: usuario.nombre, correo: usuario.correo, rol: usuario.rol } });
  return { data: { id } };
}
