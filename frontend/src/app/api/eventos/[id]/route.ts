import { NextRequest, NextResponse } from 'next/server';
import { actualizarEvento, eliminarEvento } from '@backend/services/eventos.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = { params: Promise<{ id: string }> };

async function eventoId(params: Params['params']) {
  const id = Number((await params).id);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export async function PUT(request: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  const id = await eventoId(params);
  const body = await request.json().catch(() => null);
  if (!id) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
  if (!body) return NextResponse.json({ error: 'Solicitud inválida.' }, { status: 400 });
  const result = await actualizarEvento(id, {
    titulo: String(body.titulo || ''),
    iniciaEn: String(body.iniciaEn || ''),
    finalizaEn: body.finalizaEn ? String(body.finalizaEn) : undefined,
    descripcion: body.descripcion ? String(body.descripcion) : undefined,
    ubicacion: body.ubicacion ? String(body.ubicacion) : undefined,
    tipo: body.tipo ? String(body.tipo) : undefined,
    color: body.color ? String(body.color) : undefined,
    todoElDia: body.todoElDia === true,
  }, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;
  const id = await eventoId(params);
  if (!id) return NextResponse.json({ error: 'Evento inválido.' }, { status: 400 });
  const result = await eliminarEvento(id, auth.usuario);
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
