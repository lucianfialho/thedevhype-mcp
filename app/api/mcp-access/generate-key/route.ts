import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    console.log('[generate-key] handler start');
    const { data: session } = await auth.getSession();
    const userId = session?.user?.id;
    console.log('[generate-key] session resolved, userId:', userId ? 'present' : 'missing');
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let mcpName: string;
    try {
      const body = await request.json();
      mcpName = body.mcpName;
      console.log('[generate-key] parsed body, mcpName:', mcpName);
    } catch (parseErr) {
      console.error('[generate-key] body parse failed:', parseErr);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!mcpName || typeof mcpName !== 'string') {
      return NextResponse.json({ error: 'mcpName is required' }, { status: 400 });
    }

    const existing = await db
      .select({ enabled: userMcpAccess.enabled })
      .from(userMcpAccess)
      .where(
        and(
          eq(userMcpAccess.userId, userId),
          eq(userMcpAccess.mcpName, mcpName),
        ),
      )
      .limit(1);

    if (existing.length === 0 || !existing[0].enabled) {
      return NextResponse.json(
        { error: 'Server must be enabled to generate a key' },
        { status: 400 },
      );
    }

    const apiKey = `sk-${crypto.randomUUID()}`;
    await db
      .update(userMcpAccess)
      .set({ apiKey })
      .where(
        and(
          eq(userMcpAccess.userId, userId),
          eq(userMcpAccess.mcpName, mcpName),
        ),
      );

    console.log('[generate-key] success for mcpName:', mcpName);
    return NextResponse.json({ apiKey });
  } catch (err) {
    console.error('[generate-key] unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
