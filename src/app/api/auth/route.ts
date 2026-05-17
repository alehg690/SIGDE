import { NextRequest, NextResponse } from 'next/server';
import { login, enviarCodigoRecuperacion, cambiarContrasena } from '@/backend/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { accion } = body;

  if (accion === 'login') {
    const { correo, contrasena } = body;
    if (!correo || !contrasena) {
      return NextResponse.json({ error: 'Correo y contraseña son requeridos' }, { status: 400 });
    }
    const resultado = login(correo, contrasena);
    if (resultado.error) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json({ mensaje: 'Login exitoso', usuario: resultado.data });
  }

  if (accion === 'recuperar') {
    const { correo } = body;
    if (!correo) {
      return NextResponse.json({ error: 'El correo es requerido' }, { status: 400 });
    }
    const resultado = await enviarCodigoRecuperacion(correo);
    if (resultado.error) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json(resultado.data);
  }

  if (accion === 'cambiarContrasena') {
    const { correo, codigo, nuevaContrasena } = body;
    if (!correo || !codigo || !nuevaContrasena) {
      return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    }
    const resultado = cambiarContrasena(correo, codigo, nuevaContrasena);
    if (resultado.error) {
      return NextResponse.json({ error: resultado.error }, { status: resultado.status });
    }
    return NextResponse.json(resultado.data);
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}