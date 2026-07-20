import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  autorizarRoles,
  esErrorAutorizacion,
  type ResultadoAutorizacion,
} from '@backend/middleware/rol.middleware';
import { type RolUsuario } from '@backend/types/roles';

export type AuthResult = ResultadoAutorizacion;

export async function requerirSesion(rolesPermitidos?: RolUsuario[]): Promise<AuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  return autorizarRoles(token, rolesPermitidos);
}

export function esErrorAuth(result: AuthResult): result is { response: NextResponse } {
  return esErrorAutorizacion(result);
}
