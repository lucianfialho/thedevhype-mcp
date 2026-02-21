import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request) {
  try {
    const { data: session } = await auth.getSession().catch(() => ({ data: null }));
    const userId = session?.user?.id;
    if (!userId) {
      return json({ error: 'Not authenticated' }, 401);
    }

    let mcpName: string;
    try {
      const body = await request.json();
      mcpName = body.mcpName;
    } catch {
      return json({ error: 'Invalid request body' }, 400);
    }

    if (!mcpName || typeof mcpName !== 'string') {
      return json({ error: 'mcpName is required' }, 400);
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
      return json({ error: 'Server must be enabled to generate a key' }, 400);
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

    return json({ apiKey });
  } catch (err) {
    console.error('[generate-key] unhandled error:', err);
    return json({ error: 'Internal server error' }, 500);
  }
}
