import { createHash } from 'crypto';
import { db } from '@backend/config/database';

export type PoliticaLimite = {
  maxIntentos: number;
  ventanaMs: number;
  bloqueoMs: number;
};

type RateLimitRow = {
  intentos: number;
  bloqueadoHasta: string | null;
};

export const LIMITES_AUTH = {
  loginCuenta: { maxIntentos: 5, ventanaMs: 15 * 60_000, bloqueoMs: 15 * 60_000 },
  loginCliente: { maxIntentos: 30, ventanaMs: 15 * 60_000, bloqueoMs: 15 * 60_000 },
  recuperacionCuenta: { maxIntentos: 3, ventanaMs: 30 * 60_000, bloqueoMs: 30 * 60_000 },
  recuperacionCliente: { maxIntentos: 15, ventanaMs: 30 * 60_000, bloqueoMs: 30 * 60_000 },
  codigoCuenta: { maxIntentos: 5, ventanaMs: 15 * 60_000, bloqueoMs: 15 * 60_000 },
  codigoCliente: { maxIntentos: 20, ventanaMs: 15 * 60_000, bloqueoMs: 15 * 60_000 },
} satisfies Record<string, PoliticaLimite>;

export function crearClaveLimite(tipo: string, identificador: string) {
  const hash = createHash('sha256')
    .update(identificador.trim().toLowerCase())
    .digest('hex');
  return `${tipo}:${hash}`;
}

export async function consultarLimite(clave: string) {
  const result = await db.execute({
    sql: 'SELECT intentos, bloqueadoHasta FROM AuthRateLimit WHERE clave = ? LIMIT 1',
    args: [clave],
  });
  const row = result.rows[0] as unknown as RateLimitRow | undefined;
  const bloqueadoHasta = row?.bloqueadoHasta ? new Date(String(row.bloqueadoHasta)) : null;
  const restanteMs = bloqueadoHasta ? bloqueadoHasta.getTime() - Date.now() : 0;

  return {
    bloqueado: restanteMs > 0,
    reintentarEnSegundos: Math.max(0, Math.ceil(restanteMs / 1000)),
  };
}

export async function registrarIntento(
  clave: string,
  tipo: string,
  politica: PoliticaLimite
) {
  const ahora = new Date();
  const ahoraIso = ahora.toISOString();
  const corteVentanaIso = new Date(ahora.getTime() - politica.ventanaMs).toISOString();
  const bloqueadoHastaIso = new Date(ahora.getTime() + politica.bloqueoMs).toISOString();

  const result = await db.execute({
    sql: `
      INSERT INTO AuthRateLimit (clave, tipo, intentos, ventanaInicia, bloqueadoHasta, actualizadoEn)
      VALUES (?, ?, 1, ?, NULL, ?)
      ON CONFLICT(clave) DO UPDATE SET
        tipo = excluded.tipo,
        intentos = CASE
          WHEN ventanaInicia <= ? OR (bloqueadoHasta IS NOT NULL AND bloqueadoHasta <= ?) THEN 1
          ELSE intentos + 1
        END,
        ventanaInicia = CASE
          WHEN ventanaInicia <= ? OR (bloqueadoHasta IS NOT NULL AND bloqueadoHasta <= ?) THEN ?
          ELSE ventanaInicia
        END,
        bloqueadoHasta = CASE
          WHEN (
            CASE
              WHEN ventanaInicia <= ? OR (bloqueadoHasta IS NOT NULL AND bloqueadoHasta <= ?) THEN 1
              ELSE intentos + 1
            END
          ) >= ? THEN ?
          ELSE NULL
        END,
        actualizadoEn = ?
      RETURNING intentos, bloqueadoHasta
    `,
    args: [
      clave, tipo, ahoraIso, ahoraIso,
      corteVentanaIso, ahoraIso,
      corteVentanaIso, ahoraIso, ahoraIso,
      corteVentanaIso, ahoraIso, politica.maxIntentos, bloqueadoHastaIso,
      ahoraIso,
    ],
  });

  const row = result.rows[0] as unknown as RateLimitRow;
  const bloqueadoHasta = row.bloqueadoHasta ? new Date(String(row.bloqueadoHasta)) : null;
  const restanteMs = bloqueadoHasta ? bloqueadoHasta.getTime() - ahora.getTime() : 0;

  return {
    intentos: Number(row.intentos),
    bloqueado: restanteMs > 0,
    reintentarEnSegundos: Math.max(0, Math.ceil(restanteMs / 1000)),
  };
}

export async function limpiarLimite(clave: string) {
  await db.execute({ sql: 'DELETE FROM AuthRateLimit WHERE clave = ?', args: [clave] });
}
