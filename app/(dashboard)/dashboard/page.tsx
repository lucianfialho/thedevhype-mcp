import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userInNeonAuth, userMcpAccess, userProfiles, waitlist } from '@/app/lib/db/public.schema';
import { eq, sql, and, isNotNull } from 'drizzle-orm';
import { DashboardHome } from './dashboard-home';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ 'reset-onboarding'?: string }>;
}) {
  const params = await searchParams;
  const { data: session } = await auth.getSession();
  const user = session?.user;

  if (!user?.id) redirect('/');

  // Waitlist gate: block only users with a pending/rejected waitlist entry.
  // No entry = existing user before waitlist, let them through.
  const [wlEntry] = await db
    .select({ status: waitlist.status })
    .from(waitlist)
    .where(eq(waitlist.userId, user.id));

  if (wlEntry && wlEntry.status !== 'approved') redirect('/waitlist');

  if (user.id) {
    if (params['reset-onboarding'] === '1') {
      await db
        .update(userProfiles)
        .set({ onboardingCompletedAt: null })
        .where(eq(userProfiles.userId, user.id));
      redirect('/onboarding');
    }

    const [profile] = await db
      .select({ onboardingCompletedAt: userProfiles.onboardingCompletedAt })
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id));

    if (!profile?.onboardingCompletedAt) {
      // Check if user already has MCP keys — if so, auto-complete onboarding
      const [existingKey] = await db
        .select({ id: userMcpAccess.id })
        .from(userMcpAccess)
        .where(and(eq(userMcpAccess.userId, user.id), isNotNull(userMcpAccess.apiKey)))
        .limit(1);

      if (existingKey) {
        await db
          .insert(userProfiles)
          .values({ userId: user.id, onboardingCompletedAt: new Date().toISOString() })
          .onConflictDoUpdate({
            target: userProfiles.userId,
            set: { onboardingCompletedAt: sql`CURRENT_TIMESTAMP` },
          });
      } else {
        redirect('/onboarding');
      }
    }
  }

  const isAdmin = user?.id
    ? await db
        .select({ role: userInNeonAuth.role })
        .from(userInNeonAuth)
        .where(eq(userInNeonAuth.id, user.id))
        .then((r) => r[0]?.role === 'admin')
    : false;

  return (
    <DashboardHome
      userName={user?.name || ''}
      isAdmin={isAdmin}
    />
  );
}
