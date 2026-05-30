import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@backend/config/database';
import { emailTransporter } from '@backend/config/email';

type UsuarioAuthRow = {
  id: number;
  nombre: string;
  correo: string;
  contrasena: string;
  rol: string;
  activo: number;
  tokenRecuperacion: string | null;
  tokenExpira: string | null;
};

type RecuperacionThrottle = {
  envios: number;
  disponibleEn: number;
};

const MENSAJE_CODIGO_ENVIADO = 'Código enviado correctamente';
const PRIMER_REENVIO_MS = 60 * 1000;
const INCREMENTO_REENVIO_MS = 5 * 60 * 1000;
const throttlesRecuperacion = new Map<string, RecuperacionThrottle>();

function obtenerEsperaMs(numeroEnvio: number) {
  if (numeroEnvio <= 1) return PRIMER_REENVIO_MS;
  return (numeroEnvio - 1) * INCREMENTO_REENVIO_MS;
}

function formatearEspera(ms: number) {
  const segundos = Math.ceil(ms / 1000);
  const minutos = Math.floor(segundos / 60);
  const resto = segundos % 60;
  return minutos > 0 ? `${minutos}m ${resto}s` : `${resto}s`;
}

function validarThrottleRecuperacion(correo: string) {
  const ahora = Date.now();
  const throttle = throttlesRecuperacion.get(correo);

  if (throttle && throttle.disponibleEn > ahora) {
    return {
      error: `Espera ${formatearEspera(throttle.disponibleEn - ahora)} antes de solicitar otro código`,
      status: 429,
    };
  }

  const envios = (throttle?.envios ?? 0) + 1;
  throttlesRecuperacion.set(correo, {
    envios,
    disponibleEn: ahora + obtenerEsperaMs(envios),
  });

  return null;
}

export async function hashPassword(contrasena: string) {
  return bcrypt.hash(contrasena, 10);
}

export async function verificarPassword(contrasena: string, hash: string) {
  return bcrypt.compare(contrasena, hash);
}

async function buscarUsuarioPorCorreo(correo: string) {
  const result = await db.execute({
    sql: 'SELECT * FROM Usuario WHERE LOWER(correo) = LOWER(?) LIMIT 1',
    args: [correo],
  });

  return result.rows[0] as unknown as UsuarioAuthRow | undefined;
}

export async function login(correo: string, contrasena: string) {
  const usuario = await buscarUsuarioPorCorreo(correo);

  if (!usuario) {
    return { error: 'Correo o contraseña incorrectos', status: 401 };
  }

  const passwordValida = await verificarPassword(contrasena, usuario.contrasena);

  if (!passwordValida) {
    return { error: 'Correo o contraseña incorrectos', status: 401 };
  }

  if (!usuario.activo) {
    return { error: 'Usuario inactivo', status: 403 };
  }

  return {
    data: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    },
  };
}

export async function enviarCodigoRecuperacion(correo: string) {
  const throttle = validarThrottleRecuperacion(correo);

  if (throttle) {
    return throttle;
  }

  const usuario = await buscarUsuarioPorCorreo(correo);

  if (!usuario) {
    return { data: { mensaje: MENSAJE_CODIGO_ENVIADO } };
  }

  const codigo = randomInt(100000, 1000000).toString();
  const codigoHash = await hashPassword(codigo);
  const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await db.execute({
    sql: 'UPDATE Usuario SET tokenRecuperacion = ?, tokenExpira = ? WHERE id = ?',
    args: [codigoHash, expira, usuario.id],
  });

  await emailTransporter.sendMail({
    from: `"no.reply-SIGDE" <${process.env.EMAIL_USER}>`,
    to: correo,
    subject: 'Código de verificación - SIGDE',
    html: `
      <div style="font-family: system-ui, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px;">
        <h2 style="color: #0a1628;">Recuperación de contraseña</h2>
        <p style="color: #4a6280;">Tu código de verificación es:</p>
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0a1628; margin: 24px 0;">
          ${codigo}
        </div>
        <p style="color: #7a90a8; font-size: 13px;">Este código expira en 15 minutos.</p>
        <p style="color: #7a90a8; font-size: 13px;">Si no solicitaste este cambio, ignora este mensaje.</p>
      </div>
    `,
  });

  return { data: { mensaje: MENSAJE_CODIGO_ENVIADO } };
}

export async function verificarCodigo(correo: string, codigo: string) {
  const usuario = await buscarUsuarioPorCorreo(correo);

  const codigoValido = usuario?.tokenRecuperacion
    ? await verificarPassword(codigo, usuario.tokenRecuperacion)
    : false;

  if (!usuario || !codigoValido) {
    return { error: 'Código incorrecto', status: 400 };
  }

  if (!usuario.tokenExpira || new Date() > new Date(usuario.tokenExpira)) {
    return { error: 'El código ha expirado', status: 400 };
  }

  return { data: { mensaje: 'Código válido' } };
}

export async function cambiarContrasena(
  correo: string,
  codigo: string,
  nuevaContrasena: string
) {
  const usuario = await buscarUsuarioPorCorreo(correo);

  const codigoValido = usuario?.tokenRecuperacion
    ? await verificarPassword(codigo, usuario.tokenRecuperacion)
    : false;

  if (!usuario || !codigoValido) {
    return { error: 'Código incorrecto', status: 400 };
  }

  if (!usuario.tokenExpira || new Date() > new Date(usuario.tokenExpira)) {
    return { error: 'El código ha expirado', status: 400 };
  }

  const hash = await hashPassword(nuevaContrasena);

  await db.execute({
    sql: `
      UPDATE Usuario
      SET contrasena = ?,
          tokenRecuperacion = NULL,
          tokenExpira = NULL
      WHERE id = ?
    `,
    args: [hash, usuario.id],
  });

  return { data: { mensaje: 'Contraseña actualizada correctamente' } };
}
