import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import {
  cambiarContrasena,
  enviarCodigoRecuperacion,
  login,
  validarContrasenaSegura,
  verificarCodigo,
} from '@backend/services/auth.service';
import { crearToken } from '@backend/utils/jwt';

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 128;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type SessionPayload = {
  id?: number;
  correo?: string;
  rol?: string;
  exp?: number;
};

function correoValido(correo: string) {
  return correo.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(correo);
}

function obtenerJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 24) {
    throw new Error('JWT_SECRET debe existir y tener al menos 24 caracteres');
  }

  return new TextEncoder().encode(secret);
}

async function leerSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) return null;

  const { payload } = await jwtVerify(token, obtenerJwtSecret());
  const session = payload as SessionPayload;

  if (!session.id || !session.correo || !session.rol || !session.exp) {
    return null;
  }

  return {
    usuario: {
      id: session.id,
      correo: session.correo,
      rol: session.rol,
    },
    expiraEn: session.exp,
    expiraEnMs: Math.max(0, session.exp * 1000 - Date.now()),
  };
}

export async function GET() {
  try {
    const sesion = await leerSesion();

    if (!sesion) {
      return NextResponse.json({ autenticado: false }, { status: 401 });
    }

    return NextResponse.json({ autenticado: true, ...sesion });
  } catch {
    const response = NextResponse.json(
      { autenticado: false, error: 'Sesion expirada' },
      { status: 401 }
    );
    response.cookies.delete('token');
    return response;
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
        { error: 'Correo y contraseña son requeridos' },
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
      priority: 'high',
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

    if (!correoValido(correo)) {
      return NextResponse.json(
        { error: 'Ingresa un correo valido' },
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

    if (!correoValido(correo) || !/^\d{6}$/.test(codigo)) {
      return NextResponse.json(
        { error: 'Codigo incorrecto' },
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

    if (!correoValido(correo) || !/^\d{6}$/.test(codigo)) {
      return NextResponse.json(
        { error: 'Codigo incorrecto' },
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
