import { NextRequest, NextResponse } from 'next/server';
import { login, enviarCodigoRecuperacion, cambiarContrasena, verificarCodigo } from '@/backend/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { accion } = body;

  if (accion === 'login') {
    const { correo, contrasena, rolSeleccionado } = body;
    if (!correo || !contrasena) return NextResponse.json({ error: 'Correo y contraseña son requeridos' }, { status: 400 });
    const r = await login(correo, contrasena, rolSeleccionado);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    else return NextResponse.json({ mensaje: 'Login exitoso', usuario: r.data });
  }

  if (accion === 'recuperar') {
    const { correo } = body;
    if (!correo) return NextResponse.json({ error: 'El correo es requerido' }, { status: 400 });
    const r = await enviarCodigoRecuperacion(correo);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    else return NextResponse.json(r.data);
  }

  if (accion === 'verificarCodigo') {
    const { correo, codigo } = body;
    if (!correo || !codigo) return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    const r = await verificarCodigo(correo, codigo);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    else return NextResponse.json(r.data);
  }

  if (accion === 'cambiarContrasena') {
    const { correo, codigo, nuevaContrasena } = body;
    if (!correo || !codigo || !nuevaContrasena) return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
    const r = await cambiarContrasena(correo, codigo, nuevaContrasena);
    if ('error' in r) return NextResponse.json({ error: r.error }, { status: r.status });
    else return NextResponse.json(r.data);
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
}