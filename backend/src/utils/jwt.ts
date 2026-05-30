import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET!;

export function crearToken(payload: object) {
  return jwt.sign(payload, SECRET, {
    expiresIn: '7d',
  });
}