import { NextRequest, NextResponse } from 'next/server';
import { crearSalida, listarSalidas } from '@backend/services/salidas.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Coordinador', 'Porteria']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarSalidas(auth.usuario);
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const auth = await requerirSesion(['Coordinador', 'Porteria']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await crearSalida(
    {
      estudianteId: String(body.estudianteId || ''),
      estudiante: String(body.estudiante || ''),
      grado: String(body.grado || ''),
      acudiente: String(body.acudiente || ''),
      motivo: String(body.motivo || ''),
      urgencia: body.urgencia === true,
      estado: body.estado ? String(body.estado) : undefined,
    },
    auth.usuario
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: result.status });
}
