import { NextRequest, NextResponse } from 'next/server';
import { reportServerError } from '@backend/utils/logger';

const WINDOW_MS = 5 * 60_000;
const MAX_REPORTS = 10;
const reportsByClient = new Map<string, { count: number; resetAt: number }>();

function clientKey(request: NextRequest) {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function acceptsReport(request: NextRequest) {
  const key = clientKey(request);
  const now = Date.now();
  const current = reportsByClient.get(key);
  if (!current || current.resetAt <= now) {
    reportsByClient.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (current.count >= MAX_REPORTS) return false;
  current.count += 1;
  return true;
}

function cleanText(value: unknown, maximum: number) {
  return typeof value === 'string' ? value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maximum) : '';
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (origin && origin !== request.nextUrl.origin) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 });
  }
  if (!acceptsReport(request)) {
    return NextResponse.json({ error: 'Límite de reportes alcanzado' }, { status: 429 });
  }

  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 4_096) {
    return NextResponse.json({ error: 'Reporte demasiado grande' }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
  }

  const message = cleanText(body.message, 300) || 'Error de interfaz no identificado';
  const digest = cleanText(body.digest, 128) || 'no-digest';
  const path = cleanText(body.path, 200).startsWith('/') ? cleanText(body.path, 200) : '/unknown';
  await reportServerError(`client_runtime_error:${path}`, new Error(`${message} [${digest}]`));
  return new NextResponse(null, { status: 202, headers: { 'Cache-Control': 'no-store' } });
}
