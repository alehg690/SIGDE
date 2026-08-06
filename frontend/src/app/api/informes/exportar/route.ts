import { NextRequest, NextResponse } from 'next/server';
import { exportarInforme } from '@backend/services/informe.service';
import { esErrorAuth, requerirSesion } from '@/app/api/_utils/session';

export async function GET(req: NextRequest) {
  const auth = await requerirSesion(['Coordinador']);
  if (esErrorAuth(auth)) return auth.response;

  const searchParams = req.nextUrl.searchParams;
  const result = await exportarInforme(
    searchParams.get('tipo') || 'resumen',
    searchParams.get('formato') || 'pdf',
    auth.usuario
  );

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return new NextResponse(result.data, {
    headers: {
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
