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

  try {
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

    return NextResponse.json({ apiKey });
  } catch (err) {
    console.error('[mcp-access/generate-key] DB error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
