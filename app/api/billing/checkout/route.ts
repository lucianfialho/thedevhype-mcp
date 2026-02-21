import { NextResponse } from 'next/server';
import { auth } from '@/app/lib/auth/server';
import { stripe } from '@/app/lib/billing/stripe';
import { PLANS, type PlanName } from '@/app/lib/billing/config';
import { getStripeCustomerId } from '@/app/lib/billing/subscriptions';

export async function POST(request: Request) {
  const { data: session } = await auth.getSession();
  const user = session?.user;

  if (!user?.id) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const body = await request.json();
  const plan = body.plan as PlanName;

  if (!plan || !PLANS[plan]) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const planConfig = PLANS[plan];

  // Reuse existing Stripe customer or create new one
  let customerId = await getStripeCustomerId(user.id);

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: { userId: user.id },
    });
    customerId = customer.id;
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: planConfig.stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId: user.id,
      plan,
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        plan,
      },
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.thedevhype.com'}/dashboard/billing?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.thedevhype.com'}/pricing`,
  });

  return NextResponse.json({ url: checkoutSession.url });
}
