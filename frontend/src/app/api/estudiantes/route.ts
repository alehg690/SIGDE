import { NextRequest, NextResponse } from 'next/server';
import { crearEstudiante, listarEstudiantes } from '@backend/services/estudiantes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarEstudiantes();
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await crearEstudiante({
    nombre: String(body.nombre || ''),
    documento: body.documento ? String(body.documento) : undefined,
    grado: String(body.grado || ''),
    grupo: String(body.grupo || ''),
    estado: body.estado ? String(body.estado) : undefined,
    activo: body.activo !== false,
    acudienteNombre: String(body.acudienteNombre || ''),
    acudienteCorreo: body.acudienteCorreo ? String(body.acudienteCorreo) : undefined,
    acudienteTelefono: body.acudienteTelefono ? String(body.acudienteTelefono) : undefined,
    acudienteDocumento: body.acudienteDocumento ? String(body.acudienteDocumento) : undefined,
  }, auth.usuario);

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
