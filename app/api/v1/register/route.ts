import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';
import { apiKeys, userInNeonAuth } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';
import { auth } from '@/app/lib/auth/server';
import crypto from 'crypto';
import { sendEmail } from '@/app/lib/email';
import { ApiKeyRegistered } from '@/app/lib/email/templates/api-key-registered';

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

    // Try to link to logged-in user, fallback to matching by email
    let userId: string | undefined;
    const { data: session } = await auth.getSession().catch(() => ({ data: null }));
    if (session?.user?.id) {
      userId = session.user.id;
    } else {
      const [userByEmail] = await db
        .select({ id: userInNeonAuth.id })
        .from(userInNeonAuth)
        .where(eq(userInNeonAuth.email, email))
        .limit(1);
      if (userByEmail) userId = userByEmail.id;
    }

    const key = `pk-${crypto.randomUUID()}`;

    await db.insert(apiKeys).values({
      key,
      name,
      email,
      userId: userId ?? null,
      tier: 'free',
      rateLimit: 100,
      dailyLimit: 1000,
    });

    void sendEmail({
      to: email,
      subject: 'Your TheDevHype API key is ready',
      react: ApiKeyRegistered({
        name,
        email,
        keyPrefix: key.substring(0, 8),
        tier: 'free',
      }),
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
