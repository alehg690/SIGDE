const SENSITIVE_VALUES = ['TURSO_AUTH_TOKEN', 'JWT_SECRET', 'EMAIL_PASS', 'ALERT_WEBHOOK_URL'] as const;

function safeMessage(error: unknown) {
  const message = error instanceof Error ? error.message : 'Error no identificado';
  return SENSITIVE_VALUES.reduce((current, name) => {
    const value = process.env[name];
    return value ? current.replaceAll(value, '[REDACTED]') : current;
  }, message);
}

export function logServerError(event: string, error: unknown) {
  const entry = {
    level: 'error',
    event,
    message: safeMessage(error),
    environment: process.env.APP_ENV || process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(entry));
  return entry;
}

export async function reportServerError(event: string, error: unknown) {
  const entry = logServerError(event, error);
  const webhookUrl = process.env.ALERT_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;

  const summary = `[SIGDE] ${entry.event}: ${entry.message}`;
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...entry, text: summary, content: summary }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) throw new Error(`Webhook respondió HTTP ${response.status}`);
  } catch (reportError) {
    console.error(JSON.stringify({
      level: 'error',
      event: 'monitoring_alert_delivery_failed',
      message: safeMessage(reportError),
      timestamp: new Date().toISOString(),
    }));
  }
}
