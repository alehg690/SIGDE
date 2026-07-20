import { NextRequest, NextResponse } from 'next/server';
import { editarAcudiente } from '@backend/services/acudientes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

type Params = {
  params: Promise<{ id: string }>;
};

export async function PUT(req: NextRequest, { params }: Params) {
  const auth = await requerirSesion(['Admin', 'Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const { id } = await params;
  const acudienteId = Number(id);
  const body = await req.json().catch(() => null);

  if (!Number.isInteger(acudienteId) || acudienteId <= 0) {
    return NextResponse.json({ error: 'Acudiente no válido' }, { status: 400 });
  }
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await editarAcudiente(
    acudienteId,
    {
      nombre: String(body.nombre || ''),
      correo: body.correo ? String(body.correo) : undefined,
      telefono: body.telefono ? String(body.telefono) : undefined,
      documento: body.documento ? String(body.documento) : undefined,
    },
    auth.usuario
  );

  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json(result.data);
}
