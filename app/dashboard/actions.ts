'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function toggleMcpAccess(mcpName: string) {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  await db
    .insert(userMcpAccess)
    .values({ userId, mcpName, enabled: true })
    .onConflictDoUpdate({
      target: [userMcpAccess.userId, userMcpAccess.mcpName],
      set: { enabled: sql`NOT ${userMcpAccess.enabled}` },
    });

  revalidatePath('/dashboard');
}
