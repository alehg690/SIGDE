import { NextRequest, NextResponse } from 'next/server';
import { cambiarEstadoReporte, editarReporte, obtenerReporte } from '@backend/services/reportes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const reporteId = Number(id);
  if (!Number.isInteger(reporteId) || reporteId <= 0) {
    return NextResponse.json({ error: 'Reporte no válido' }, { status: 400 });
  }

  const result = await obtenerReporte(reporteId, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const reporteId = Number(id);
  const body = await req.json().catch(() => null);

  if (!Number.isInteger(reporteId) || reporteId <= 0) {
    return NextResponse.json({ error: 'Reporte no válido' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await cambiarEstadoReporte(
    reporteId,
    String(body.estado || ''),
    body.observaciones ? String(body.observaciones) : undefined,
    auth.usuario
  );
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const reporteId = Number(id);
  const body = await req.json().catch(() => null);

  if (!Number.isInteger(reporteId) || reporteId <= 0) {
    return NextResponse.json({ error: 'Reporte no válido' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await editarReporte(reporteId, auth.usuario, {
    fechaHecho: body.fechaHecho ? String(body.fechaHecho) : undefined,
    lugar: body.lugar === undefined ? undefined : String(body.lugar),
    situacion: body.situacion === undefined ? undefined : String(body.situacion),
    descripcion: body.descripcion === undefined ? undefined : String(body.descripcion),
    actuacionInicial: body.actuacionInicial === undefined ? undefined : String(body.actuacionInicial),
    confidencial: body.confidencial === undefined ? undefined : body.confidencial === true,
  });

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
