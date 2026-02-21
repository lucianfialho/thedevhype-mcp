import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { data: session } = await auth.getSession().catch(() => ({ data: null }));
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let mcpName: string;
    try {
      const body = await request.json();
      mcpName = body.mcpName;
    } catch {
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
      return NextResponse.json({ error: 'Server must be enabled to generate a key' }, { status: 400 });
    }

    const apiKey = `sk-${globalThis.crypto.randomUUID()}`;
    await db
      .update(userMcpAccess)
      .set({ apiKey })
      .where(
        and(
          eq(userMcpAccess.userId, userId),
          eq(userMcpAccess.mcpName, mcpName),
        ),
      );

    return NextResponse.json({ apiKey });
  } catch (err) {
    console.error('[generate-key] unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
