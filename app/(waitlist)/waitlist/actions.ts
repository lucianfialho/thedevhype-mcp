'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { waitlist } from '@/app/lib/db/public.schema';
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';

export async function submitWaitlist(data: {
  building: string;
  aiTools: string;
  mcpExcitement: string;
}) {
  const { data: session } = await auth.getSession();
  if (!session?.user?.id) redirect('/');

  await db.insert(waitlist).values({
    userId: session.user.id,
    building: data.building,
    aiTools: data.aiTools,
    mcpExcitement: data.mcpExcitement || null,
  });

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(waitlist);

  return { position: count };
}
