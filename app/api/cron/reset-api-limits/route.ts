import { NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { apiKeys } from '@/app/lib/db/public.schema';
import { sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const isNewDay = now.getUTCHours() === 0;

    // Reset hourly counter every run
    await db
      .update(apiKeys)
      .set({
        requestsThisHour: 0,
        ...(isNewDay ? { requestsToday: 0 } : {}),
      })
      .where(sql`1=1`);

    return NextResponse.json({
      ok: true,
      resetHourly: true,
      resetDaily: isNewDay,
    });
  } catch (err) {
    console.error('[cron/reset-api-limits] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
