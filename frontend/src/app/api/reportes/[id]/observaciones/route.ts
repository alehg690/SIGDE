import { NextRequest, NextResponse } from 'next/server';
import { agregarObservacionReporte } from '@backend/services/reportes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador', 'Docente']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const reporteId = Number(id);
  const body = await req.json().catch(() => null);
  if (!Number.isInteger(reporteId) || reporteId <= 0) {
    return NextResponse.json({ error: 'Reporte no válido' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await agregarObservacionReporte(reporteId, String(body.texto || ''), auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data, { status: result.status });
}
