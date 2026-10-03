import { NextResponse } from 'next/server';
import { db } from '@backend/config/database';
import { logServerError } from '@backend/utils/logger';

export async function GET() {
  const startedAt = performance.now();

  try {
    await db.execute('SELECT 1');
    return NextResponse.json(
      {
        status: 'ok',
        checks: {
          database: {
            status: 'ok',
            latencyMs: Math.round(performance.now() - startedAt),
          },
        },
        timestamp: new Date().toISOString(),
      },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (error) {
    logServerError('health_check_database_failed', error);
    return NextResponse.json(
      {
        status: 'unavailable',
        checks: { database: { status: 'unavailable' } },
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  }
}
