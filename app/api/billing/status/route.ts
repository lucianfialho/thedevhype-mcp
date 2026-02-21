import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/server';
import { getUserSubscriptions, isGrandfathered } from '@/app/lib/billing/subscriptions';

export async function GET() {
  const { data: session } = await auth.getSession();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const [grandfathered, allSubscriptions] = await Promise.all([
    isGrandfathered(user.id),
    getUserSubscriptions(user.id),
  ]);

  const activeSubscriptions = allSubscriptions
    .filter((s) => s.status === 'active')
    .map((s) => s.plan);

  return NextResponse.json({
    grandfathered,
    subscriptions: activeSubscriptions,
    allSubscriptions: allSubscriptions.map((s) => ({
      plan: s.plan,
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    })),
  });
}
