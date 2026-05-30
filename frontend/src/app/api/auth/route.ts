import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  cambiarContrasena,
  enviarCodigoRecuperacion,
  login,
  verificarCodigo,
} from '@backend/services/auth.service';
import { crearToken } from '@backend/utils/jwt';

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });
  }

  const accion = body.accion;

  if (accion === 'login') {
    const correo = String(body.correo || '').trim().toLowerCase();
    const contrasena = String(body.contrasena || '');

    if (!correo || !contrasena) {
      return NextResponse.json(
        { error: 'Correo y contraseña son requeridos' },
        { status: 400 }
      );
    }

    const r = await login(correo, contrasena);

    if ('error' in r) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }

    const usuario = r.data;
    const token = crearToken({
      id: usuario.id,
      correo: usuario.correo,
      rol: usuario.rol,
    });

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return NextResponse.json({ mensaje: 'Login exitoso', usuario });
  }

  if (accion === 'logout') {
    const cookieStore = await cookies();
    cookieStore.delete('token');
    return NextResponse.json({ mensaje: 'Sesión cerrada' });
  }

  if (accion === 'recuperar') {
    const correo = String(body.correo || '').trim().toLowerCase();

    if (!correo) {
      return NextResponse.json(
        { error: 'El correo es requerido' },
        { status: 400 }
      );
    }

    const r = await enviarCodigoRecuperacion(correo);

    if ('error' in r) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }

    return NextResponse.json(r.data);
  }

  if (accion === 'verificarCodigo') {
    const correo = String(body.correo || '').trim().toLowerCase();
    const codigo = String(body.codigo || '').trim();

    if (!correo || !codigo) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    const r = await verificarCodigo(correo, codigo);

    if ('error' in r) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }

    return NextResponse.json(r.data);
  }

  if (accion === 'cambiarContrasena') {
    const correo = String(body.correo || '').trim().toLowerCase();
    const codigo = String(body.codigo || '').trim();
    const nuevaContrasena = String(body.nuevaContrasena || '');

    if (!correo || !codigo || !nuevaContrasena) {
      return NextResponse.json(
        { error: 'Todos los campos son requeridos' },
        { status: 400 }
      );
    }

    if (nuevaContrasena.length < 8) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 8 caracteres' },
        { status: 400 }
      );
    }

    const r = await cambiarContrasena(correo, codigo, nuevaContrasena);

    if ('error' in r) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }

    return NextResponse.json(r.data);
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
