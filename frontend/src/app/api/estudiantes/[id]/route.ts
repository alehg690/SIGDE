import { NextRequest, NextResponse } from 'next/server';
import { actualizarEstudiante, archivarEstudiante, obtenerEstudiante } from '@backend/services/estudiantes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = {
  params: Promise<{ id: string }>;
};

function parseId(id: string) {
  const estudianteId = Number(id);
  return Number.isInteger(estudianteId) && estudianteId > 0 ? estudianteId : null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const estudianteId = parseId(id);
  if (!estudianteId) return NextResponse.json({ error: 'Estudiante no válido' }, { status: 400 });

  const result = await obtenerEstudiante(estudianteId);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const estudianteId = parseId(id);
  const body = await req.json().catch(() => null);

  if (!estudianteId) return NextResponse.json({ error: 'Estudiante no válido' }, { status: 400 });
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await actualizarEstudiante(estudianteId, {
    nombre: String(body.nombre || ''),
    documento: body.documento ? String(body.documento) : undefined,
    grado: String(body.grado || ''),
    grupo: String(body.grupo || ''),
    estado: body.estado ? String(body.estado) : undefined,
    activo: body.activo !== false,
    acudienteNombre: String(body.acudienteNombre || ''),
    acudienteContacto: String(body.acudienteContacto || ''),
  }, auth.usuario);

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const estudianteId = parseId(id);
  if (!estudianteId) return NextResponse.json({ error: 'Estudiante no válido' }, { status: 400 });

  const result = await archivarEstudiante(estudianteId, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
