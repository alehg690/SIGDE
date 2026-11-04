import { NextRequest, NextResponse } from 'next/server';
import {
  consultarLimite,
  crearClaveLimite,
  registrarIntento,
  type PoliticaLimite,
} from '@backend/services/auth-rate-limit.service';
import { registrarAccion } from '@backend/services/auditoria.service';
import { reportServerError } from '@backend/utils/logger';
import type { SesionUsuario } from '@backend/types/roles';
import { obtenerIdentificadorCliente } from '@/app/api/_utils/client-address';

export const LIMITES_API = {
  administracion: { maxIntentos: 30, ventanaMs: 10 * 60_000, bloqueoMs: 10 * 60_000 },
  reportes: { maxIntentos: 60, ventanaMs: 10 * 60_000, bloqueoMs: 10 * 60_000 },
  evidencias: { maxIntentos: 20, ventanaMs: 10 * 60_000, bloqueoMs: 10 * 60_000 },
  exportaciones: { maxIntentos: 10, ventanaMs: 10 * 60_000, bloqueoMs: 10 * 60_000 },
} satisfies Record<string, PoliticaLimite>;

function respuestaLimite(reintentarEnSegundos: number) {
  return NextResponse.json(
    { error: 'Demasiadas solicitudes. Intenta nuevamente más tarde.' },
    {
      status: 429,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(Math.max(1, reintentarEnSegundos)),
      },
    }
  );
}

export async function limitarOperacion(
  request: NextRequest,
  usuario: SesionUsuario,
  alcance: string,
  politica: PoliticaLimite
) {
  const tipo = `api-${alcance}`;
  const clave = crearClaveLimite(tipo, `usuario:${usuario.id}|cliente:${obtenerIdentificadorCliente(request)}`);
  const limiteActual = await consultarLimite(clave);
  if (limiteActual.bloqueado) return respuestaLimite(limiteActual.reintentarEnSegundos);

  const intento = await registrarIntento(clave, tipo, politica);
  if (intento.bloqueado) {
    void registrarAccion({
      usuarioId: usuario.id,
      accion: 'limite_solicitudes_activado',
      entidad: 'Seguridad',
      entidadId: alcance,
      detalle: { metodo: request.method, ruta: request.nextUrl.pathname },
    }).catch((error) => reportServerError('rate_limit_audit_failed', error));
  }

  return null;
}
