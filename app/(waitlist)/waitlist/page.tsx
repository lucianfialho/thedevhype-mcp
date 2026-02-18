import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { waitlist, userProfiles } from '@/app/lib/db/public.schema';
import { eq, sql } from 'drizzle-orm';
import { WaitlistForm, WaitlistStatus } from './waitlist-form';

export const dynamic = 'force-dynamic';

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ force?: string }>;
}) {
  const params = await searchParams;
  const force = params.force === '1';

  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id) redirect('/');

  const [entry] = await db
    .select()
    .from(waitlist)
    .where(eq(waitlist.userId, user.id));

  if (!force && entry?.status === 'approved') redirect('/dashboard');

  if (entry) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(waitlist)
      .where(eq(waitlist.status, 'pending'));

    return <WaitlistStatus position={count} />;
  }

  // Existing user (has profile) = skip waitlist, go to dashboard
  if (!force) {
    const [profile] = await db
      .select({ userId: userProfiles.userId })
      .from(userProfiles)
      .where(eq(userProfiles.userId, user.id));

    if (profile) redirect('/dashboard');
  }

  return <WaitlistForm />;
}
