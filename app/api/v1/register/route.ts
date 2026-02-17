import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { apiKeys } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Both "name" and "email" are required.' },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format.' },
        { status: 400 },
      );
    }

    // Check if email already has a key
    const [existing] = await db
      .select({ key: apiKeys.key })
      .from(apiKeys)
      .where(eq(apiKeys.email, email))
      .limit(1);

    if (existing) {
      return NextResponse.json(
        { error: 'An API key already exists for this email. Contact support if you lost your key.' },
        { status: 409 },
      );
    }

    const key = `pk-${crypto.randomUUID()}`;

    await db.insert(apiKeys).values({
      key,
      name,
      email,
      tier: 'free',
      rateLimit: 100,
      dailyLimit: 1000,
    });

    return NextResponse.json({
      data: {
        api_key: key,
        tier: 'free',
        rate_limit: '100 requests/hour',
        daily_limit: '1000 requests/day',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
}
