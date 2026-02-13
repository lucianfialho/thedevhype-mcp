import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { mcpName } = await request.json();
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

  let enabled: boolean;
  let apiKey: string | null = null;

  if (existing.length > 0) {
    enabled = !existing[0].enabled;
    apiKey = enabled ? `sk-${crypto.randomUUID()}` : null;
    await db
      .update(userMcpAccess)
      .set({ enabled, apiKey })
      .where(
        and(
          eq(userMcpAccess.userId, userId),
          eq(userMcpAccess.mcpName, mcpName),
        ),
      );
  } else {
    enabled = true;
    apiKey = `sk-${crypto.randomUUID()}`;
    await db
      .insert(userMcpAccess)
      .values({ userId, mcpName, enabled, apiKey });
  }

  return NextResponse.json({ enabled, apiKey });
}
