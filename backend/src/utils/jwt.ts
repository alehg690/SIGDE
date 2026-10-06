import { SignJWT, jwtVerify, type JWTPayload } from 'jose';
import { getJwtSecret } from '@backend/config/env';

const SESSION_DURATION = '30m';
const JWT_ALGORITHM = 'HS256';
const JWT_ISSUER = 'sigde';
const JWT_AUDIENCE = 'sigde-web';

export type SessionTokenPayload = {
  id: number;
  versionSesion: number;
};

function obtenerJwtSecret() {
  return new TextEncoder().encode(getJwtSecret());
}

export async function crearToken(payload: SessionTokenPayload) {
  return new SignJWT({ id: payload.id, versionSesion: payload.versionSesion })
    .setProtectedHeader({ alg: JWT_ALGORITHM, typ: 'JWT' })
    .setIssuedAt()
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(SESSION_DURATION)
    .sign(obtenerJwtSecret());
}

export async function verificarToken(token: string): Promise<JWTPayload & SessionTokenPayload> {
  const { payload } = await jwtVerify(token, obtenerJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
  const id = Number(payload.id);
  const versionSesion = Number(payload.versionSesion);

  if (!Number.isInteger(id) || id <= 0 || !Number.isInteger(versionSesion) || versionSesion <= 0) {
    throw new Error('El token de sesión no contiene un identificador válido');
  }

  return { ...payload, id, versionSesion };
}
