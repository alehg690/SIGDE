import { NextRequest, NextResponse } from 'next/server';
import { crearEstudiante, listarEstudiantes } from '@backend/services/estudiantes.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET() {
  const auth = await requerirSesion(['Coordinador', 'Docente', 'Porteria']);
  if (esErrorAuth(auth)) return auth.response;

  const result = await listarEstudiantes();
  return NextResponse.json(result.data);
}

export async function POST(req: NextRequest) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 });

  const result = await crearEstudiante({
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

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json(result.data, { status: result.status });
}
