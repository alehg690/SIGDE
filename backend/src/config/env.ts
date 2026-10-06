const MINIMUM_JWT_SECRET_LENGTH = 32;
const APP_ENVIRONMENTS = ['development', 'production'] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

function requiredValue(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta la variable de entorno obligatoria: ${name}`);
  return value;
}

export function getAppEnvironment(): AppEnvironment {
  const value = process.env.APP_ENV?.trim();
  if (!value) {
    // Next.js sets NODE_ENV=development for `next dev`; keeping this local
    // fallback avoids turning developer tooling into an accidental deployment.
    if (process.env.NODE_ENV === 'development') return 'development';
    throw new Error('Falta la variable de entorno obligatoria: APP_ENV');
  }
  if (!APP_ENVIRONMENTS.includes(value as AppEnvironment)) {
    throw new Error('APP_ENV debe ser development o production');
  }

  const environment = value as AppEnvironment;
  const expectedNodeEnvironment = environment === 'development' ? 'development' : 'production';
  if (process.env.NODE_ENV !== expectedNodeEnvironment) {
    throw new Error(`APP_ENV=${environment} requiere NODE_ENV=${expectedNodeEnvironment}`);
  }
  return environment;
}

export function isEmailEnabled() {
  const value = process.env.EMAIL_ENABLED?.trim().toLowerCase();
  if (!value && getAppEnvironment() === 'development') return false;
  if (value !== 'true' && value !== 'false') {
    throw new Error('EMAIL_ENABLED debe ser true o false');
  }
  return value === 'true';
}

export function getTursoConfig() {
  getAppEnvironment();
  isEmailEnabled();
  const url = requiredValue('TURSO_DATABASE_URL');
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('TURSO_DATABASE_URL debe ser una URL válida de libSQL/Turso');
  }
  if (!['libsql:', 'https:', 'file:'].includes(parsed.protocol)) {
    throw new Error('TURSO_DATABASE_URL debe usar libsql:, https: o file:');
  }

  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (parsed.protocol !== 'file:' && !authToken) {
    throw new Error('Falta la variable de entorno obligatoria: TURSO_AUTH_TOKEN');
  }
  return { url, authToken };
}

export function getJwtSecret() {
  const secret = requiredValue('JWT_SECRET');
  if (secret.length < MINIMUM_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET debe tener al menos ${MINIMUM_JWT_SECRET_LENGTH} caracteres`);
  }
  return secret;
}

export function getEmailConfig() {
  const user = requiredValue('EMAIL_USER');
  const pass = requiredValue('EMAIL_PASS');
  return { user, pass };
}
