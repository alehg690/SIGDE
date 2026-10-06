import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import {
  cambiarContrasena,
  cambiarContrasenaTemporal,
  enviarCodigoRecuperacion,
  login,
  validarContrasenaSegura,
  verificarCodigo,
} from '@backend/services/auth.service';
import { crearToken, verificarToken } from '@backend/utils/jwt';
import { autorizarRoles, esErrorAutorizacion } from '@backend/middleware/rol.middleware';
import type { SesionUsuario } from '@backend/types/roles';
import {
  getSessionCookieName,
  getSessionCookieOptions,
  LEGACY_SESSION_COOKIE_NAME,
} from '@backend/utils/session-cookie';

const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 128;
const MAX_REQUEST_BODY_BYTES = 8 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function crearPayloadSesion(usuario: Pick<SesionUsuario, 'id' | 'versionSesion'>) {
  return {
    id: usuario.id,
    versionSesion: usuario.versionSesion,
  };
}

function serializarEstadoSesion(usuario: Pick<SesionUsuario, 'requiereCambioContrasena'>) {
  return { requiereCambioContrasena: usuario.requiereCambioContrasena };
}

function obtenerClienteId(req: NextRequest) {
  const forwarded = process.env.NODE_ENV === 'production'
    ? req.headers.get('x-vercel-forwarded-for')
    : req.headers.get('x-vercel-forwarded-for')
      || req.headers.get('x-forwarded-for')
      || req.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0]?.trim();
  return (ip || `sin-ip:${req.headers.get('user-agent') || 'desconocido'}`).slice(0, 256);
}

function limpiarCookiesSesion(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.delete(getSessionCookieName());
  cookieStore.delete(LEGACY_SESSION_COOKIE_NAME);
}

function establecerCookieSesion(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  token: string
) {
  cookieStore.set(getSessionCookieName(), token, getSessionCookieOptions());
  cookieStore.delete(LEGACY_SESSION_COOKIE_NAME);
}

function correoValido(correo: string) {
  return correo.length <= EMAIL_MAX_LENGTH && EMAIL_PATTERN.test(correo);
}

/** GET /api/auth — verifica si hay sesión activa leyendo la cookie */
export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    const response = NextResponse.json({ autenticado: false });
    response.cookies.delete(LEGACY_SESSION_COOKIE_NAME);
    return response;
  }

  try {
    const payload = await verificarToken(token);
    const auth = await autorizarRoles(token, undefined, true);
    if (esErrorAutorizacion(auth)) {
      limpiarCookiesSesion(cookieStore);
      return auth.response;
    }
    return NextResponse.json({
      autenticado: true,
      usuario: serializarEstadoSesion(auth.usuario),
      expiraEn: typeof payload.exp === 'number' ? payload.exp : null,
    });
  } catch {
    limpiarCookiesSesion(cookieStore);
    return NextResponse.json({ autenticado: false });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;

  const contentLength = Number(req.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BODY_BYTES) {
    return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 });
  }

  try {
    const rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_REQUEST_BODY_BYTES) {
      return NextResponse.json({ error: 'Solicitud demasiado grande' }, { status: 413 });
    }
    const parsed: unknown = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid body');
    body = parsed as Record<string, unknown>;
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

    const r = await login(correo, contrasena, obtenerClienteId(req));

    if ('error' in r) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }

    const usuario = r.data;
    const token = await crearToken(crearPayloadSesion(usuario));

    const cookieStore = await cookies();
    establecerCookieSesion(cookieStore, token);

    return NextResponse.json({
      mensaje: 'Inicio de sesión exitoso',
      requiereCambioContrasena: usuario.requiereCambioContrasena,
    });
  }

  if (accion === 'renovarSesion') {
    const cookieStore = await cookies();
    const tokenActual = cookieStore.get(getSessionCookieName())?.value;

    if (!tokenActual) {
      return NextResponse.json({ autenticado: false }, { status: 401 });
    }

    try {
      const auth = await autorizarRoles(tokenActual, undefined, true);
      if (esErrorAutorizacion(auth)) {
        limpiarCookiesSesion(cookieStore);
        return auth.response;
      }
      const token = await crearToken(crearPayloadSesion(auth.usuario));
      const sesion = await verificarToken(token);

      establecerCookieSesion(cookieStore, token);

      return NextResponse.json({
        autenticado: true,
        usuario: serializarEstadoSesion(auth.usuario),
        expiraEn: typeof sesion.exp === 'number' ? sesion.exp : null,
      });
    } catch {
      limpiarCookiesSesion(cookieStore);
      return NextResponse.json({ autenticado: false }, { status: 401 });
    }
  }

  if (accion === 'logout') {
    const cookieStore = await cookies();
    limpiarCookiesSesion(cookieStore);
    return NextResponse.json({ mensaje: 'Sesión cerrada' });
  }

  if (accion === 'cambiarContrasenaTemporal') {
    const cookieStore = await cookies();
    const auth = await autorizarRoles(cookieStore.get(getSessionCookieName())?.value, undefined, true);
    if (esErrorAutorizacion(auth)) return auth.response;
    const contrasenaActual = typeof body.contrasenaActual === 'string' ? body.contrasenaActual : '';
    const nuevaContrasena = typeof body.nuevaContrasena === 'string' ? body.nuevaContrasena : '';
    if (!contrasenaActual || !nuevaContrasena || contrasenaActual.length > PASSWORD_MAX_LENGTH || nuevaContrasena.length > PASSWORD_MAX_LENGTH) {
      return NextResponse.json({ error: 'Ingresa contraseñas válidas' }, { status: 400 });
    }
    const r = await cambiarContrasenaTemporal(auth.usuario.id, auth.usuario.versionSesion, contrasenaActual, nuevaContrasena);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    const token = await crearToken({ id: auth.usuario.id, versionSesion: r.data.versionSesion });
    establecerCookieSesion(cookieStore, token);
    return NextResponse.json({ mensaje: r.data.mensaje });
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

    const r = await enviarCodigoRecuperacion(correo, obtenerClienteId(req));

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

    const r = await verificarCodigo(correo, codigo, obtenerClienteId(req));

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

    const r = await cambiarContrasena(correo, codigo, nuevaContrasena, obtenerClienteId(req));

    if ('error' in r) {
      return NextResponse.json({ error: r.error }, { status: r.status });
    }

    return NextResponse.json(r.data);
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}
