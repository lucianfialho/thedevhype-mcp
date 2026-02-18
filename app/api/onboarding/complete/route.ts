import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userProfiles } from '@/app/lib/db/public.schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await db
    .insert(userProfiles)
    .values({ userId, onboardingCompletedAt: new Date().toISOString() })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { onboardingCompletedAt: sql`CURRENT_TIMESTAMP` },
    });

  return NextResponse.json({ completed: true });
}
