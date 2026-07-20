import { NextRequest, NextResponse } from 'next/server';
import { crearConvivencia, listarConvivencia } from '@backend/services/reportes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Admin', 'Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarConvivencia();
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const auth = await requerirSesion(['Admin', 'Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await crearConvivencia(
    {
      estudianteId: String(body.estudianteId || ''),
      estudiante: String(body.estudiante || ''),
      grado: String(body.grado || ''),
      tipo: String(body.tipo || ''),
      descripcion: String(body.descripcion || ''),
      etapa: String(body.etapa || ''),
      competencia: String(body.competencia || ''),
      notificacionAcudiente: String(body.notificacionAcudiente || ''),
      requiereSiuce: body.requiereSiuce === true,
      evidencia: body.evidencia ? String(body.evidencia) : undefined,
    },
    auth.usuario
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: result.status });
}
