import { NextRequest, NextResponse } from 'next/server';
import { crearUsuario, listarUsuarios } from '@backend/services/usuarios.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Admin', 'Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarUsuarios();
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const auth = await requerirSesion(['Admin']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await crearUsuario({
    nombre: String(body.nombre || ''),
    correo: String(body.correo || ''),
    rol: String(body.rol || ''),
    contrasena: String(body.contrasena || ''),
    activo: body.activo !== false,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
