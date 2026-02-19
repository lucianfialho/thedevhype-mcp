'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';

export async function generateApiKey(mcpName: string) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return { error: 'Not authenticated' };

  if (!mcpName || typeof mcpName !== 'string') return { error: 'mcpName is required' };

  const existing = await db
    .select({ enabled: userMcpAccess.enabled })
    .from(userMcpAccess)
    .where(and(eq(userMcpAccess.userId, userId), eq(userMcpAccess.mcpName, mcpName)))
    .limit(1);

  if (existing.length === 0 || !existing[0].enabled) {
    return { error: 'Server must be enabled to generate a key' };
  }

  const apiKey = `sk-${globalThis.crypto.randomUUID()}`;
  await db
    .update(userMcpAccess)
    .set({ apiKey })
    .where(and(eq(userMcpAccess.userId, userId), eq(userMcpAccess.mcpName, mcpName)));

  return { apiKey };
}
