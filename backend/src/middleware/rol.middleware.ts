import { NextResponse } from 'next/server';
import { verificarToken } from '@backend/utils/jwt';
import {
  normalizarRol,
  type RolUsuario,
  type SesionUsuario,
} from '@backend/types/roles';

export type ResultadoAutorizacion =
  | { usuario: SesionUsuario }
  | { response: NextResponse };

export function esErrorAutorizacion(
  result: ResultadoAutorizacion
): result is { response: NextResponse } {
  return 'response' in result;
}

export function extraerBearerToken(headers: Headers) {
  const authorization = headers.get('authorization');
  if (!authorization) return null;

  const [scheme, token] = authorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;

  return token;
}

export async function autorizarRoles(
  token: string | null | undefined,
  rolesPermitidos?: RolUsuario[]
): Promise<ResultadoAutorizacion> {
  if (!token) {
    return {
      response: NextResponse.json({ error: 'Sesion requerida' }, { status: 401 }),
    };
  }

  try {
    const payload = await verificarToken(token);
    const rol = normalizarRol(String(payload.rol || ''));

    if (!rol) {
      return {
        response: NextResponse.json({ error: 'Rol no valido' }, { status: 403 }),
      };
    }

    const id = Number(payload.id);
    if (!Number.isInteger(id) || id <= 0) {
      return {
        response: NextResponse.json({ error: 'Sesion invalida' }, { status: 401 }),
      };
    }

    const usuario: SesionUsuario = {
      id,
      nombre: String(payload.nombre || ''),
      correo: String(payload.correo || ''),
      rol,
    };

    if (rolesPermitidos && !rolesPermitidos.includes(usuario.rol)) {
      return {
        response: NextResponse.json({ error: 'No tienes permisos para esta accion' }, { status: 403 }),
      };
    }

    return { usuario };
  } catch {
    return {
      response: NextResponse.json({ error: 'Sesion invalida' }, { status: 401 }),
    };
  }
}
