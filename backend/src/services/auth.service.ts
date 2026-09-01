import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { db } from '@backend/config/database';
import { emailTransporter } from '@backend/config/email';
import {
  consultarLimite,
  crearClaveLimite,
  LIMITES_AUTH,
  limpiarLimite,
  registrarIntento,
} from '@backend/services/auth-rate-limit.service';

type UsuarioAuthRow = {
  id: number;
  nombre: string;
  correo: string;
  contrasena: string;
  rol: string;
  activo: number;
  versionSesion: number;
  tokenRecuperacion: string | null;
  tokenExpira: string | null;
};

const MENSAJE_RECUPERACION = 'Si existe una cuenta asociada, recibirás un código de verificación.';
const HASH_COMPARACION = bcrypt.hash('SIGDE-comparacion-segura-2026', 10);

function respuestaBloqueo(reintentarEnSegundos: number) {
  return {
    error: `Demasiados intentos. Inténtalo nuevamente en ${Math.max(1, reintentarEnSegundos)} segundos.`,
    status: 429,
  };
}

export function validarContrasenaSegura(contrasena: string) {
  if (contrasena.length < 8) return 'La contraseña debe tener al menos 8 caracteres';
  if (contrasena.length > 128) return 'La contraseña no puede superar 128 caracteres';
  if (!/[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(contrasena) || !/[0-9]/.test(contrasena)) {
    return 'La contraseña debe combinar letras y números';
  }

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

export async function login(correo: string, contrasena: string, clienteId: string) {
  const claveCuenta = crearClaveLimite('login-cuenta', correo);
  const claveCliente = crearClaveLimite('login-cliente', clienteId);
  const [limiteCuenta, limiteCliente] = await Promise.all([
    consultarLimite(claveCuenta),
    consultarLimite(claveCliente),
  ]);

  if (limiteCuenta.bloqueado || limiteCliente.bloqueado) {
    return respuestaBloqueo(Math.max(limiteCuenta.reintentarEnSegundos, limiteCliente.reintentarEnSegundos));
  }

  const usuario = await buscarUsuarioPorCorreo(correo);
  const passwordValida = await verificarPassword(
    contrasena,
    usuario?.contrasena || await HASH_COMPARACION
  );

  if (!usuario || !passwordValida) {
    const [falloCuenta, falloCliente] = await Promise.all([
      registrarIntento(claveCuenta, 'login-cuenta', LIMITES_AUTH.loginCuenta),
      registrarIntento(claveCliente, 'login-cliente', LIMITES_AUTH.loginCliente),
    ]);
    if (falloCuenta.bloqueado || falloCliente.bloqueado) {
      return respuestaBloqueo(Math.max(falloCuenta.reintentarEnSegundos, falloCliente.reintentarEnSegundos));
    }
    return { error: 'Correo o contraseña incorrectos', status: 401 };
  }

  if (!usuario.activo) {
    return { error: 'Usuario inactivo', status: 403 };
  }

  await db.execute({
    sql: 'UPDATE Usuario SET ultimoAcceso = CURRENT_TIMESTAMP WHERE id = ?',
    args: [usuario.id],
  });
  await limpiarLimite(claveCuenta);

  return {
    data: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      versionSesion: Number(usuario.versionSesion || 1),
    },
  };
}

export async function enviarCodigoRecuperacion(correo: string, clienteId: string) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return {
      error: 'La recuperación por correo aún no está configurada. Contacta a coordinación para restablecer tu acceso.',
      status: 503,
    };
  }

  const claveCuenta = crearClaveLimite('recuperacion-cuenta', correo);
  const claveCliente = crearClaveLimite('recuperacion-cliente', clienteId);
  const [limiteCuenta, limiteCliente] = await Promise.all([
    consultarLimite(claveCuenta),
    consultarLimite(claveCliente),
  ]);
  if (limiteCuenta.bloqueado || limiteCliente.bloqueado) {
    return respuestaBloqueo(Math.max(limiteCuenta.reintentarEnSegundos, limiteCliente.reintentarEnSegundos));
  }

  await Promise.all([
    registrarIntento(claveCuenta, 'recuperacion-cuenta', LIMITES_AUTH.recuperacionCuenta),
    registrarIntento(claveCliente, 'recuperacion-cliente', LIMITES_AUTH.recuperacionCliente),
  ]);

  const usuario = await buscarUsuarioPorCorreo(correo);
  if (!usuario || !usuario.activo) return { data: { mensaje: MENSAJE_RECUPERACION } };

  const codigo = randomInt(100000, 1000000).toString();
  const codigoHash = await hashPassword(codigo);
  const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  await db.execute({
    sql: 'UPDATE Usuario SET tokenRecuperacion = ?, tokenExpira = ? WHERE id = ?',
    args: [codigoHash, expira, usuario.id],
  });

  try {
    await emailTransporter.sendMail({
      from: `"SIGDE" <${process.env.EMAIL_USER}>`,
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
  } catch (error) {
    console.error('No se pudo enviar el código de recuperación.', error);
    return { data: { mensaje: MENSAJE_RECUPERACION } };
  }

  return { data: { mensaje: MENSAJE_RECUPERACION } };
}

async function validarCodigoRecuperacion(correo: string, codigo: string, clienteId: string) {
  const claveCuenta = crearClaveLimite('codigo-cuenta', correo);
  const claveCliente = crearClaveLimite('codigo-cliente', clienteId);
  const [limiteCuenta, limiteCliente] = await Promise.all([
    consultarLimite(claveCuenta),
    consultarLimite(claveCliente),
  ]);
  if (limiteCuenta.bloqueado || limiteCliente.bloqueado) {
    return respuestaBloqueo(Math.max(limiteCuenta.reintentarEnSegundos, limiteCliente.reintentarEnSegundos));
  }

  const usuario = await buscarUsuarioPorCorreo(correo);
  const codigoValido = await verificarPassword(
    codigo,
    usuario?.tokenRecuperacion || await HASH_COMPARACION
  );
  const codigoVigente = Boolean(
    usuario?.tokenExpira && new Date() <= new Date(usuario.tokenExpira)
  );

  if (!usuario || !usuario.activo || !codigoValido || !codigoVigente) {
    const [falloCuenta, falloCliente] = await Promise.all([
      registrarIntento(claveCuenta, 'codigo-cuenta', LIMITES_AUTH.codigoCuenta),
      registrarIntento(claveCliente, 'codigo-cliente', LIMITES_AUTH.codigoCliente),
    ]);
    if (falloCuenta.bloqueado || falloCliente.bloqueado) {
      return respuestaBloqueo(Math.max(falloCuenta.reintentarEnSegundos, falloCliente.reintentarEnSegundos));
    }
    return { error: 'Código incorrecto o expirado', status: 400 };
  }

  await limpiarLimite(claveCuenta);
  return { data: usuario };
}

export async function verificarCodigo(correo: string, codigo: string, clienteId: string) {
  const validacion = await validarCodigoRecuperacion(correo, codigo, clienteId);
  if ('error' in validacion) return validacion;
  return { data: { mensaje: 'Código válido' } };
}

export async function cambiarContrasena(
  correo: string,
  codigo: string,
  nuevaContrasena: string,
  clienteId: string
) {
  const errorContrasena = validarContrasenaSegura(nuevaContrasena);

  if (errorContrasena) {
    return { error: errorContrasena, status: 400 };
  }

  const validacion = await validarCodigoRecuperacion(correo, codigo, clienteId);
  if ('error' in validacion) return validacion;
  const usuario = validacion.data;

  const hash = await hashPassword(nuevaContrasena);

  await db.execute({
    sql: `
      UPDATE Usuario
      SET contrasena = ?,
          tokenRecuperacion = NULL,
          tokenExpira = NULL,
          versionSesion = versionSesion + 1
      WHERE id = ?
    `,
    args: [hash, usuario.id],
  });

  return { data: { mensaje: 'Contraseña actualizada correctamente' } };
}
