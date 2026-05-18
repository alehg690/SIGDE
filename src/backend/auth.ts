import path from 'path';
import Database from 'better-sqlite3';
import nodemailer from 'nodemailer';

const dbPath = path.join(process.cwd(), 'dev.db');

type Usuario = {
  id: number;
  nombre: string;
  correo: string;
  contrasena: string;
  rol: string;
  activo: number;
  tokenRecuperacion: string | null;
  tokenExpira: string | null;
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export function login(correo: string, contrasena: string, rolSeleccionado?: string) {
  const db = new Database(dbPath);
  const usuario = db.prepare('SELECT * FROM Usuario WHERE LOWER(correo) = LOWER(?)').get(correo) as Usuario | undefined;
  db.close();

  if (!usuario || usuario.contrasena !== contrasena) {
    return { error: 'Correo o contraseña incorrectos', status: 401 };
  }
  if (!usuario.activo) {
    return { error: 'Usuario inactivo', status: 403 };
  }
  if (rolSeleccionado && usuario.rol.toLowerCase() !== 'admin' && usuario.rol.toLowerCase() !== rolSeleccionado.toLowerCase()) {
    return { error: 'El perfil seleccionado no corresponde a este usuario', status: 403 };
  }
  return {
    data: {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
    }
  };
}

export async function enviarCodigoRecuperacion(correo: string) {
  const db = new Database(dbPath);
  const usuario = db.prepare('SELECT * FROM Usuario WHERE LOWER(correo) = LOWER(?)').get(correo) as Usuario | undefined;

  if (!usuario) {
    db.close();
    return { error: 'No existe una cuenta con ese correo', status: 404 };
  }

  const codigo = Math.floor(100000 + Math.random() * 900000).toString();
  const expira = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  db.prepare('UPDATE Usuario SET tokenRecuperacion = ?, tokenExpira = ? WHERE id = ?').run(codigo, expira, usuario.id);
  db.close();

  await transporter.sendMail({
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

  return { data: { mensaje: 'Código enviado correctamente' } };
}

export function cambiarContrasena(correo: string, codigo: string, nuevaContrasena: string) {
  const db = new Database(dbPath);
  const usuario = db.prepare('SELECT * FROM Usuario WHERE LOWER(correo) = LOWER(?)').get(correo) as Usuario | undefined;

  if (!usuario || usuario.tokenRecuperacion !== codigo) {
    db.close();
    return { error: 'Código incorrecto', status: 400 };
  }
  if (new Date() > new Date(usuario.tokenExpira!)) {
    db.close();
    return { error: 'El código ha expirado', status: 400 };
  }
  if (usuario.contrasena === nuevaContrasena) {
    db.close();
    return { error: 'La nueva contraseña no puede ser igual a la anterior', status: 400 };
  }

  db.prepare('UPDATE Usuario SET contrasena = ?, tokenRecuperacion = NULL, tokenExpira = NULL WHERE id = ?').run(nuevaContrasena, usuario.id);
  db.close();

  return { data: { mensaje: 'Contraseña actualizada correctamente' } };
}
export function verificarCodigo(correo: string, codigo: string) {
  const db = new Database(dbPath);
  const usuario = db.prepare('SELECT * FROM Usuario WHERE LOWER(correo) = LOWER(?)').get(correo) as Usuario | undefined;

  if (!usuario || usuario.tokenRecuperacion !== codigo) {
    db.close();
    return { error: 'Código incorrecto', status: 400 };
  }
  if (new Date() > new Date(usuario.tokenExpira!)) {
    db.close();
    return { error: 'El código ha expirado', status: 400 };
  }
  db.close();
  return { data: { mensaje: 'Código válido' } };
}