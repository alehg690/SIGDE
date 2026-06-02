import jwt from 'jsonwebtoken';

function obtenerJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 24) {
    throw new Error('JWT_SECRET debe existir y tener al menos 24 caracteres');
  }

  return secret;
}

export function crearToken(payload: object) {
  return jwt.sign(payload, obtenerJwtSecret(), {
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}
