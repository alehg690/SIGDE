import { NextRequest, NextResponse } from 'next/server';
import { crearReporte, listarReportes } from '@backend/services/reportes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarReportes(auth.usuario);
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await crearReporte(
    {
      estudianteId: Number(body.estudianteId),
      tipoFalta: Number(body.tipoFalta),
      fechaHecho: body.fechaHecho ? String(body.fechaHecho) : undefined,
      lugar: body.lugar ? String(body.lugar) : undefined,
      situacion: body.situacion ? String(body.situacion) : undefined,
      descripcion: String(body.descripcion || ''),
      actuacionInicial: body.actuacionInicial ? String(body.actuacionInicial) : undefined,
      confidencial: body.confidencial === true,
      evidenciaUrl: body.evidenciaUrl ? String(body.evidenciaUrl) : undefined,
    },
    auth.usuario
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: result.status });
}
