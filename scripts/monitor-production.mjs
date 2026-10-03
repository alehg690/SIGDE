const baseUrl = (process.env.PRODUCTION_URL || 'https://www.sigde.xyz').replace(/\/$/, '');
const timeoutMs = Number(process.env.MONITOR_TIMEOUT_MS || 15_000);

async function request(path) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: 'follow',
    headers: { 'User-Agent': 'SIGDE-Production-Monitor/1.0' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await response.text();
  if (!response.ok) throw new Error(`${path} respondió HTTP ${response.status}`);
  return { response, body };
}

async function notifyFailure(message) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL?.trim();
  if (!webhookUrl) return;
  const summary = `[SIGDE monitor] ${message}`;
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: summary, content: summary }),
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`No se pudo enviar la alerta: HTTP ${response.status}`);
}

async function run() {
  const home = await request('/');
  const csp = home.response.headers.get('content-security-policy') || '';
  const robotsHeader = home.response.headers.get('x-robots-tag') || '';
  if (!csp.includes("default-src 'self'") || !csp.includes("frame-ancestors 'none'")) {
    throw new Error('La página principal no entrega la CSP esperada');
  }
  if (!robotsHeader.includes('noindex')) {
    throw new Error('La página principal no entrega X-Robots-Tag: noindex');
  }

  const robots = await request('/robots.txt');
  if (!/User-Agent:\s*\*/i.test(robots.body) || !/Disallow:\s*\//i.test(robots.body)) {
    throw new Error('robots.txt no bloquea la indexación pública');
  }

  const health = await request('/api/health');
  const payload = JSON.parse(health.body);
  if (payload.status !== 'ok' || payload.checks?.database?.status !== 'ok') {
    throw new Error('El health check no confirma la disponibilidad de la base de datos');
  }

  console.log(JSON.stringify({
    status: 'ok',
    url: baseUrl,
    databaseLatencyMs: payload.checks.database.latencyMs,
    checkedAt: new Date().toISOString(),
  }));
}

try {
  await run();
} catch (error) {
  const message = error instanceof Error ? error.message : 'Fallo desconocido';
  console.error(JSON.stringify({ status: 'failed', url: baseUrl, message }));
  try {
    await notifyFailure(message);
  } catch (notificationError) {
    console.error(notificationError instanceof Error ? notificationError.message : notificationError);
  }
  process.exitCode = 1;
}
