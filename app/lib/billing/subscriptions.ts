import type Stripe from 'stripe';
import { db } from '../db';
import { subscriptions, waitlist, userProfiles } from '../db/public.schema';
import { eq, and, inArray, lte } from 'drizzle-orm';
import { PLANS, BILLING_LAUNCH_DATE, type PlanName } from './config';

/**
 * Check if a user has access to a specific MCP server.
 * Access is granted if the user is grandfathered OR has an active subscription covering this MCP.
 */
export async function hasAccessToMcp(userId: string, mcpName: string): Promise<boolean> {
  if (await isGrandfathered(userId)) return true;

  // Find plans that cover this MCP
  const coveringPlans = Object.entries(PLANS)
    .filter(([, config]) => config.mcpNames.includes(mcpName))
    .map(([name]) => name);

  if (coveringPlans.length === 0) return true; // unknown MCP → allow (no billing gate)

  const activeSubs = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        inArray(subscriptions.plan, coveringPlans),
      ),
    )
    .limit(1);

  return activeSubs.length > 0;
}

/**
 * Beta users get free access. A user is grandfathered if:
 * 1. Approved on the waitlist before the billing launch date, OR
 * 2. Has a user profile but no waitlist entry (pre-waitlist user)
 */
export async function isGrandfathered(userId: string): Promise<boolean> {
  // Check waitlist: approved before launch
  const [wlEntry] = await db
    .select({ approvedAt: waitlist.approvedAt })
    .from(waitlist)
    .where(
      and(
        eq(waitlist.userId, userId),
        eq(waitlist.status, 'approved'),
        lte(waitlist.approvedAt, BILLING_LAUNCH_DATE.toISOString()),
      ),
    )
    .limit(1);

  if (wlEntry) return true;

  // Pre-waitlist users: have a profile but no waitlist entry
  const [profile] = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId))
    .limit(1);

  if (!profile) return false;

  const [hasWaitlist] = await db
    .select({ id: waitlist.id })
    .from(waitlist)
    .where(eq(waitlist.userId, userId))
    .limit(1);

  return !hasWaitlist;
}

/**
 * Check if a user has an active Lucian subscription (individual or bundle).
 */
export async function hasLucianSubscription(userId: string): Promise<boolean> {
  const lucianPlans = Object.entries(PLANS)
    .filter(([, config]) => config.mcpNames.includes('lucian'))
    .map(([name]) => name);

  const [sub] = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, 'active'),
        inArray(subscriptions.plan, lucianPlans),
      ),
    )
    .limit(1);

  return !!sub;
}

/**
 * Get all subscriptions for a user (for billing status page).
 */
export async function getUserSubscriptions(userId: string) {
  return db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
}

/**
 * Find existing Stripe customer ID from subscriptions table.
 */
export async function getStripeCustomerId(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ stripeCustomerId: subscriptions.stripeCustomerId })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1);

  return row?.stripeCustomerId ?? null;
}

/**
 * Upsert a subscription record from a Stripe subscription object.
 */
export async function upsertSubscription(
  userId: string,
  plan: PlanName,
  stripeCustomerId: string,
  stripeSub: Stripe.Subscription,
) {
  const firstItem = stripeSub.items.data[0];
  const periodEnd = firstItem?.current_period_end ?? Math.floor(Date.now() / 1000);

  const values = {
    userId,
    stripeCustomerId,
    stripeSubscriptionId: stripeSub.id,
    stripePriceId: firstItem?.price.id ?? '',
    plan,
    status: stripeSub.status,
    currentPeriodEnd: new Date(periodEnd * 1000).toISOString(),
    cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
    updatedAt: new Date().toISOString(),
  };

  await db
    .insert(subscriptions)
    .values(values)
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        status: values.status,
        stripePriceId: values.stripePriceId,
        currentPeriodEnd: values.currentPeriodEnd,
        cancelAtPeriodEnd: values.cancelAtPeriodEnd,
        updatedAt: values.updatedAt,
      },
    });
}
