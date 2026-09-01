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
    primerNombre: String(body.primerNombre || ''),
    segundoNombre: String(body.segundoNombre || ''),
    primerApellido: String(body.primerApellido || ''),
    segundoApellido: String(body.segundoApellido || ''),
    tipoDocumento: String(body.tipoDocumento || ''),
    documento: String(body.documento || ''),
    correo: String(body.correo || ''),
    grado: String(body.grado || ''),
    grupo: String(body.grupo || ''),
    jornada: body.jornada ? String(body.jornada) : undefined,
    estado: String(body.estado || 'Activo'),
    acudientePrimerNombre: String(body.acudientePrimerNombre || ''),
    acudienteSegundoNombre: String(body.acudienteSegundoNombre || ''),
    acudientePrimerApellido: String(body.acudientePrimerApellido || ''),
    acudienteSegundoApellido: String(body.acudienteSegundoApellido || ''),
    acudienteTipoDocumento: String(body.acudienteTipoDocumento || ''),
    acudienteDocumento: String(body.acudienteDocumento || ''),
    acudienteParentesco: String(body.acudienteParentesco || ''),
    acudienteCorreo: String(body.acudienteCorreo || ''),
    acudienteTelefono: String(body.acudienteTelefono || ''),
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
