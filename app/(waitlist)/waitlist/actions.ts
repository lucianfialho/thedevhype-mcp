'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { waitlist } from '@/app/lib/db/public.schema';
import { redirect } from 'next/navigation';
import { sql } from 'drizzle-orm';
import { sendEmail, getUserInfo } from '@/app/lib/email';
import { WaitlistConfirmation } from '@/app/lib/email/templates/waitlist-confirmation';

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

  const user = await getUserInfo(session.user.id);
  if (user) {
    void sendEmail({
      to: user.email,
      subject: "You're on the waitlist!",
      react: WaitlistConfirmation({ name: user.name, position: count }),
    });
  }

  return { position: count };
}
