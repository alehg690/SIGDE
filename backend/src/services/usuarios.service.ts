import { db } from '@backend/config/database';
import { hashPassword, validarContrasenaSegura } from '@backend/services/auth.service';
import { normalizarRol, type RolUsuario } from '@backend/types/roles';

type UsuarioRow = {
  id: number;
  nombre: string;
  correo: string;
  rol: string;
  activo: number;
  creadoEn: string;
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
    SELECT id, nombre, correo, rol, activo, creadoEn
    FROM Usuario
    ORDER BY id ASC
  `);

  return { data: result.rows.map((row) => mapUsuario(row as unknown as UsuarioRow)) };
}

export async function obtenerUsuarioPorId(id: number) {
  const result = await db.execute({
    sql: 'SELECT id, nombre, correo, rol, activo, creadoEn FROM Usuario WHERE id = ? LIMIT 1',
    args: [id],
  });

  const usuario = result.rows[0] as unknown as UsuarioRow | undefined;
  return usuario ? mapUsuario(usuario) : null;
}

export async function crearUsuario(input: UsuarioInput) {
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
      RETURNING id, nombre, correo, rol, activo, creadoEn
    `,
    args: [nombre, correo, contrasenaHash, rol, activo],
  });

  return { data: mapUsuario(result.rows[0] as unknown as UsuarioRow), status: 201 };
}

export async function actualizarUsuario(id: number, input: UsuarioInput) {
  const validacion = validarDatosUsuario(input, false);
  if ('error' in validacion) return validacion;

  const { nombre, correo, rol } = validacion.data;
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
      SET nombre = ?, correo = ?, rol = ?, activo = ?${setContrasena}
      WHERE id = ?
      RETURNING id, nombre, correo, rol, activo, creadoEn
    `,
    args,
  });

  if (!result.rows[0]) return { error: 'Usuario no encontrado', status: 404 };
  return { data: mapUsuario(result.rows[0] as unknown as UsuarioRow) };
}

export async function cambiarEstadoUsuario(id: number, activo: boolean) {
  const result = await db.execute({
    sql: `
      UPDATE Usuario
      SET activo = ?
      WHERE id = ?
      RETURNING id, nombre, correo, rol, activo, creadoEn
    `,
    args: [activo ? 1 : 0, id],
  });

  if (!result.rows[0]) return { error: 'Usuario no encontrado', status: 404 };
  return { data: mapUsuario(result.rows[0] as unknown as UsuarioRow) };
}
