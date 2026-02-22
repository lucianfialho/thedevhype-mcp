import { NextResponse } from 'next/server';
import { stripe } from '@/app/lib/billing/stripe';
import { PLANS, planFromPriceId } from '@/app/lib/billing/config';
import type { PlanName } from '@/app/lib/billing/config';
import { upsertSubscription } from '@/app/lib/billing/subscriptions';
import type Stripe from 'stripe';
import { sendEmail, getUserInfo } from '@/app/lib/email';
import { SubscriptionActive } from '@/app/lib/email/templates/subscription-active';
import { SubscriptionUpdated } from '@/app/lib/email/templates/subscription-updated';
import { SubscriptionCanceled } from '@/app/lib/email/templates/subscription-canceled';
import { PaymentFailed } from '@/app/lib/email/templates/payment-failed';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.subscription && session.metadata?.userId && session.metadata?.plan) {
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          await upsertSubscription(
            session.metadata.userId,
            session.metadata.plan as Parameters<typeof upsertSubscription>[1],
            sub.customer as string,
            sub,
          );

          const planConfig = PLANS[session.metadata.plan as PlanName];
          if (planConfig) {
            const user = await getUserInfo(session.metadata.userId);
            if (user) {
              void sendEmail({
                to: user.email,
                subject: `Your ${planConfig.name} subscription is active`,
                react: SubscriptionActive({
                  name: user.name,
                  planName: planConfig.name,
                  planDescription: planConfig.description,
                  priceMonthly: planConfig.priceMonthly,
                }),
              });
            }
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const plan = sub.metadata?.plan || planFromPriceId(sub.items.data[0]?.price.id ?? '');
        if (userId && plan) {
          await upsertSubscription(
            userId,
            plan as Parameters<typeof upsertSubscription>[1],
            sub.customer as string,
            sub,
          );

          const planConfig = PLANS[plan as PlanName];
          if (planConfig) {
            const user = await getUserInfo(userId);
            if (user) {
              const periodEnd = sub.items.data[0]?.current_period_end ?? Math.floor(Date.now() / 1000);
              void sendEmail({
                to: user.email,
                subject: `Your ${planConfig.name} subscription was updated`,
                react: SubscriptionUpdated({
                  name: user.name,
                  planName: planConfig.name,
                  status: sub.status,
                  cancelAtPeriodEnd: sub.cancel_at_period_end,
                  currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
                }),
              });
            }
          }
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.userId;
        const plan = sub.metadata?.plan || planFromPriceId(sub.items.data[0]?.price.id ?? '');
        if (userId && plan) {
          await upsertSubscription(
            userId,
            plan as Parameters<typeof upsertSubscription>[1],
            sub.customer as string,
            sub,
          );

          const planConfig = PLANS[plan as PlanName];
          if (planConfig) {
            const user = await getUserInfo(userId);
            if (user) {
              void sendEmail({
                to: user.email,
                subject: `Your ${planConfig.name} subscription has been canceled`,
                react: SubscriptionCanceled({
                  name: user.name,
                  planName: planConfig.name,
                }),
              });
            }
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        // Extract subscription ID from parent or subscription_details
        const subId =
          (invoice.parent as { subscription_id?: string } | null)?.subscription_id
          ?? (invoice as unknown as Record<string, unknown>).subscription as string | undefined;
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(subId);
          const userId = sub.metadata?.userId;
          const plan = sub.metadata?.plan || planFromPriceId(sub.items.data[0]?.price.id ?? '');
          if (userId && plan) {
            await upsertSubscription(
              userId,
              plan as Parameters<typeof upsertSubscription>[1],
              sub.customer as string,
              sub,
            );

            const planConfig = PLANS[plan as PlanName];
            if (planConfig) {
              const user = await getUserInfo(userId);
              if (user) {
                void sendEmail({
                  to: user.email,
                  subject: 'Action required: payment failed',
                  react: PaymentFailed({
                    name: user.name,
                    planName: planConfig.name,
                  }),
                });
              }
            }
          }
        }
        break;
      }
    }
  } catch (err) {
    console.error(`[Stripe Webhook] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
