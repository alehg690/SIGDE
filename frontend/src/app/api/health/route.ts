import { NextResponse } from 'next/server';
import { db } from '@backend/config/database';
import { logServerError } from '@backend/utils/logger';

export async function GET() {
  try {
    await db.execute('SELECT 1');
    return NextResponse.json({ status: 'ok', database: 'ok' });
  } catch (error) {
    logServerError('health_check_database_failed', error);
    return NextResponse.json({ status: 'unavailable', database: 'unavailable' }, { status: 503 });
  }
}
