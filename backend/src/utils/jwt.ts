import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getJwtSecret } from '@backend/config/env';

const SESSION_DURATION = '30m';

function obtenerJwtSecret() {
  return new TextEncoder().encode(getJwtSecret());
}

export async function crearToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(SESSION_DURATION)
    .sign(obtenerJwtSecret());
}

export async function verificarToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, obtenerJwtSecret());
  return payload;
}
