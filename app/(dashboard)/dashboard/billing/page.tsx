import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import { isWaitlistApproved } from '@/app/lib/auth/waitlist';
import { getUserSubscriptions, isGrandfathered } from '@/app/lib/billing/subscriptions';
import { BillingPage } from './billing-page';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const { data: session } = await auth.getSession();
  const user = session?.user;

  if (!user?.id) redirect('/');
  if (!await isWaitlistApproved(user.id)) redirect('/waitlist');

  const [grandfathered, allSubscriptions] = await Promise.all([
    isGrandfathered(user.id),
    getUserSubscriptions(user.id),
  ]);

  return (
    <BillingPage
      grandfathered={grandfathered}
      allSubscriptions={allSubscriptions.map((s) => ({
        plan: s.plan,
        status: s.status,
        currentPeriodEnd: s.currentPeriodEnd,
        cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      }))}
    />
  );
}
