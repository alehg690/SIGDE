const SENSITIVE_VALUES = ['TURSO_AUTH_TOKEN', 'JWT_SECRET', 'EMAIL_PASS'] as const;

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Error no identificado';
  return SENSITIVE_VALUES.reduce((current, name) => {
    const value = process.env[name];
    return value ? current.replaceAll(value, '[REDACTED]') : current;
  }, message);
}

export function logServerError(event: string, error: unknown) {
  console.error(JSON.stringify({ level: 'error', event, message: safeMessage(error) }));
}
