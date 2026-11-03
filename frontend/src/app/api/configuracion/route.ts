import { NextRequest, NextResponse } from 'next/server';
import { actualizarConfiguraciones, obtenerConfiguracion } from '@backend/services/configuracion.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';
import { LIMITES_API, limitarOperacion } from '@/app/api/_utils/rate-limit';

export async function GET() {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await obtenerConfiguracion();
  return NextResponse.json(result.data);
}

export async function PUT(req: NextRequest) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  const limite = await limitarOperacion(req, auth.usuario, 'configuracion', LIMITES_API.administracion);
  if (limite) return limite;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await actualizarConfiguraciones(body.entradas ?? [{ clave: body.clave, valor: body.valor }], auth.usuario);

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
