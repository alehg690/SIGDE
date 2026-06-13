import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

function obtenerJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 24) {
    throw new Error('JWT_SECRET debe existir y tener al menos 24 caracteres');
  }

  return new TextEncoder().encode(secret);
}

export async function crearToken(payload: Record<string, unknown>) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(obtenerJwtSecret());
}

export async function verificarToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, obtenerJwtSecret());
  return payload;
}