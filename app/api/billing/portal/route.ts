import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/server';
import { stripe } from '@/app/lib/billing/stripe';
import { getStripeCustomerId } from '@/app/lib/billing/subscriptions';

export async function POST() {
  const { data: session } = await auth.getSession();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const customerId = await getStripeCustomerId(user.id);
  if (!customerId) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.thedevhype.com'}/dashboard/billing`,
  });

  return NextResponse.json({ url: portalSession.url });
}
