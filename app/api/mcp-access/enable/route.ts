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

    if (existing.length > 0) {
      if (!existing[0].enabled) {
        await db
          .update(userMcpAccess)
          .set({ enabled: true })
          .where(
            and(
              eq(userMcpAccess.userId, userId),
              eq(userMcpAccess.mcpName, mcpName),
            ),
          );
      }
    } else {
      await db
        .insert(userMcpAccess)
        .values({ userId, mcpName, enabled: true });
    }

    return NextResponse.json({ enabled: true });
  } catch (err) {
    console.error('[mcp-access/enable] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
