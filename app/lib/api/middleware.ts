import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { apiKeys, apiUsageLog } from '@/app/lib/db/public.schema';
import { eq, sql } from 'drizzle-orm';

export type ApiKeyRecord = typeof apiKeys.$inferSelect;

type HandlerFn = (
  request: NextRequest,
  apiKey: ApiKeyRecord,
) => Promise<NextResponse>;

export async function withApiAuth(request: NextRequest, handler: HandlerFn): Promise<NextResponse> {
  try {
    const start = Date.now();

    const key = extractApiKey(request);
    if (!key) {
      return NextResponse.json(
        { error: 'Missing API key. Pass it via Authorization: Bearer pk-... or X-API-Key header.' },
        { status: 401 },
      );
    }

    const [record] = await db.select().from(apiKeys).where(eq(apiKeys.key, key)).limit(1);

    if (!record || !record.enabled) {
      return NextResponse.json(
        { error: 'Invalid or disabled API key.' },
        { status: 401 },
      );
    }

    if (record.requestsThisHour >= record.rateLimit) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Limit: ${record.rateLimit} requests/hour.` },
        { status: 429 },
      );
    }

    if (record.requestsToday >= record.dailyLimit) {
      return NextResponse.json(
        { error: `Daily limit exceeded. Limit: ${record.dailyLimit} requests/day.` },
        { status: 429 },
      );
    }

    // Increment counters
    await db
      .update(apiKeys)
      .set({
        requestsThisHour: sql`${apiKeys.requestsThisHour} + 1`,
        requestsToday: sql`${apiKeys.requestsToday} + 1`,
        lastRequestAt: sql`CURRENT_TIMESTAMP`,
      })
      .where(eq(apiKeys.id, record.id));

    const response = await handler(request, record);

    // Log usage (fire-and-forget)
    const responseTime = Date.now() - start;
    const url = new URL(request.url);
    db.insert(apiUsageLog)
      .values({
        apiKeyId: record.id,
        endpoint: url.pathname,
        method: request.method,
        statusCode: response.status,
        responseTimeMs: responseTime,
      })
      .then(() => {})
      .catch(() => {});

    return response;
  } catch (err) {
    console.error('[withApiAuth] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function extractApiKey(request: NextRequest): string | null {
  const xApiKey = request.headers.get('x-api-key');
  if (xApiKey?.startsWith('pk-')) return xApiKey;

  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer pk-')) return auth.slice(7);

  return null;
}
