import { NextRequest, NextResponse } from 'next/server';
import { crearAcudiente, listarAcudientesPorEstudiante } from '@backend/services/acudientes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET(req: NextRequest) {
  const auth = await requerirSesion(['Admin', 'Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const estudianteId = Number(req.nextUrl.searchParams.get('estudianteId'));
  if (!Number.isInteger(estudianteId) || estudianteId <= 0) {
    return NextResponse.json({ error: 'Estudiante no válido' }, { status: 400 });
  }

  const result = await listarAcudientesPorEstudiante(estudianteId);
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const auth = await requerirSesion(['Admin', 'Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await crearAcudiente(
    Number(body.estudianteId),
    {
      nombre: String(body.nombre || ''),
      correo: body.correo ? String(body.correo) : undefined,
      telefono: body.telefono ? String(body.telefono) : undefined,
      documento: body.documento ? String(body.documento) : undefined,
    },
    auth.usuario
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: result.status });
}
