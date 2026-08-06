import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  cambiarContrasena,
  enviarCodigoRecuperacion,
  login,
  validarContrasenaSegura,
  verificarCodigo,
} from '@backend/services/auth.service';
import { crearToken, verificarToken } from '@backend/utils/jwt';

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 128;
const SESSION_MAX_AGE_SECONDS = 30 * 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function serializarSesion(payload: Awaited<ReturnType<typeof verificarToken>>) {
  return {
    id: Number(payload.id),
    nombre: String(payload.nombre || 'Usuario SIGDE'),
    correo: String(payload.correo || ''),
    rol: String(payload.rol || ''),
  };
}

function correoValido(correo: string) {
  return correo.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(correo);
}

/** GET /api/auth — verifica si hay sesión activa leyendo la cookie */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ autenticado: false }, { status: 401 });
  }

  try {
    const payload = await verificarToken(token);
    return NextResponse.json({
      autenticado: true,
      usuario: serializarSesion(payload),
      expiraEn: typeof payload.exp === 'number' ? payload.exp : null,
    });
  } catch {
    return NextResponse.json({ autenticado: false }, { status: 401 });
  }
}

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
        { error: 'Correo y contraseña son obligatorios' },
        { status: 400 }
      );
    }

    if (!correoValido(correo) || contrasena.length > PASSWORD_MAX_LENGTH) {
      return NextResponse.json(
        { error: 'Correo o contraseña incorrectos' },
        { status: 401 }
      );
    }

    const r = await login(correo, contrasena);

    if ('error' in r) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }

    const usuario = r.data;
    const token = await crearToken({
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    });

    const cookieStore = await cookies();
    cookieStore.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: SESSION_MAX_AGE_SECONDS,
      path: '/',
      priority: 'high',
    });

    return NextResponse.json({ mensaje: 'Inicio de sesión exitoso', usuario });
  }

  if (accion === 'renovarSesion') {
    const cookieStore = await cookies();
    const tokenActual = cookieStore.get('token')?.value;

    if (!tokenActual) {
      return NextResponse.json({ autenticado: false }, { status: 401 });
    }

    try {
      const payload = await verificarToken(tokenActual);
      const token = await crearToken(serializarSesion(payload));
      const sesion = await verificarToken(token);

      cookieStore.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: SESSION_MAX_AGE_SECONDS,
        path: '/',
        priority: 'high',
      });

      return NextResponse.json({
        autenticado: true,
        usuario: serializarSesion(sesion),
        expiraEn: typeof sesion.exp === 'number' ? sesion.exp : null,
      });
    } catch {
      return NextResponse.json({ autenticado: false }, { status: 401 });
    }
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

    if (!correoValido(correo)) {
      return NextResponse.json(
        { error: 'Ingresa un correo válido' },
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
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    if (!correoValido(correo) || !/^\d{6}$/.test(codigo)) {
      return NextResponse.json(
        { error: 'Código incorrecto' },
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
        { error: 'Todos los campos son obligatorios' },
        { status: 400 }
      );
    }

    if (!correoValido(correo) || !/^\d{6}$/.test(codigo)) {
      return NextResponse.json(
        { error: 'Código incorrecto' },
        { status: 400 }
      );
    }

    const errorContrasena = validarContrasenaSegura(nuevaContrasena);

    if (errorContrasena) {
      return NextResponse.json({ error: errorContrasena }, { status: 400 });
    }

    const r = await cambiarContrasena(correo, codigo, nuevaContrasena);

    if ('error' in r) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }

    return NextResponse.json(r.data);
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
