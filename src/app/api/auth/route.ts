import { NextRequest, NextResponse } from 'next/server';
import { login, enviarCodigoRecuperacion, cambiarContrasena, verificarCodigo, } 
from '@/backend/auth';

import { cookies } from 'next/headers';
import { crearToken } from '@/backend/jwt';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { accion } = body;

  // LOGIN
  if (accion === 'login') {
    const { correo, contrasena } = body;

    if (!correo || !contrasena) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const r = await login(correo, contrasena);

    if ('error' in r) {
      return NextResponse.json(
        { error: r.error },
        { status: r.status }
      );
    }

    const usuario = r.data;

    const token = crearToken({
      id: usuario.id,
      correo: usuario.correo,
    });

    const cookieStore = await cookies();

    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json({
      mensaje: 'Login exitoso',
      usuario,
    });
  }

  // RECUPERAR
  if (accion === 'recuperar') {
    const { correo } = body;

    if (!correo) {
      return NextResponse.json(
        { error: 'El correo es requerido' },
        { status: 400 }
      );
    }

    const r = await enviarCodigoRecuperacion(correo);

    if ('error' in r) {
      return NextResponse.json(
        { error: r.error },
        { status: r.status }
      );
    }

    return NextResponse.json(r.data);
  }

  // VERIFICAR CÓDIGO
  if (accion === 'verificarCodigo') {
    const { correo, codigo } = body;

    if (!correo || !codigo) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const r = await verificarCodigo(correo, codigo);

    if ('error' in r) {
      return NextResponse.json(
        { error: r.error },
        { status: r.status }
      );
    }

    return NextResponse.json(r.data);
  }

  // CAMBIAR CONTRASEÑA
  if (accion === 'cambiarContrasena') {
    const { correo, codigo, nuevaContrasena } = body;

    if (!correo || !codigo || !nuevaContrasena) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const r = await cambiarContrasena(
      correo,
      codigo,
      nuevaContrasena
    );

    if ('error' in r) {
      return NextResponse.json(
        { error: r.error },
        { status: r.status }
      );
    }

    return NextResponse.json(r.data);
  }

  return NextResponse.json(
    { error: 'Acción no válida' },
    { status: 400 }
  );
}