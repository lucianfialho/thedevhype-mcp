import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { data: session } = await auth.getSession();
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    let body: { mcpName?: string; enabled?: boolean };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const { mcpName, enabled: desiredEnabled } = body;
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

    // If client sends explicit enabled value, use it; otherwise toggle
    let enabled: boolean;

    if (existing.length > 0) {
      enabled = typeof desiredEnabled === 'boolean' ? desiredEnabled : !existing[0].enabled;
      await db
        .update(userMcpAccess)
        .set({ enabled })
        .where(
          and(
            eq(userMcpAccess.userId, userId),
            eq(userMcpAccess.mcpName, mcpName),
          ),
        );
    } else {
      enabled = typeof desiredEnabled === 'boolean' ? desiredEnabled : true;
      await db
        .insert(userMcpAccess)
        .values({ userId, mcpName, enabled });
    }

    return NextResponse.json({ enabled });
  } catch (err) {
    console.error('[mcp-access] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
