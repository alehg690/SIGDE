import { NextRequest, NextResponse } from 'next/server';
import { actualizarUsuario, cambiarEstadoUsuario } from '@backend/services/usuarios.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const usuarioId = Number(id);
  const body = await req.json().catch(() => null);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return NextResponse.json({ error: 'Usuario no válido' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await actualizarUsuario(usuarioId, {
    nombre: String(body.nombre || ''),
    correo: String(body.correo || ''),
    rol: String(body.rol || ''),
    contrasena: body.contrasena ? String(body.contrasena) : undefined,
    activo: body.activo !== false,
  });

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const usuarioId = Number(id);
  const body = await req.json().catch(() => null);

  if (!Number.isInteger(usuarioId) || usuarioId <= 0) {
    return NextResponse.json({ error: 'Usuario no válido' }, { status: 400 });
  }
  if (!body || typeof body.activo !== 'boolean') {
    return NextResponse.json({ error: 'Indica si el usuario queda activo' }, { status: 400 });
  }

  const result = await cambiarEstadoUsuario(usuarioId, body.activo);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data);
}
