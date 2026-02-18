import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userInNeonAuth, userProfiles } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';
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

    if (!profile?.onboardingCompletedAt) redirect('/onboarding');
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
