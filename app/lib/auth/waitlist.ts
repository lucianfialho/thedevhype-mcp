import { db } from '@/app/lib/db';
import { userProfiles, waitlist } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';

/**
 * Check if a user is approved to use the app.
 *
 * - Has waitlist entry with status 'approved' → true
 * - Has waitlist entry with status 'pending'/'rejected' → false
 * - No waitlist entry + has profile → true (grandfathered user from before waitlist)
 * - No waitlist entry + no profile → false (new user bypassing waitlist)
 */
export async function isWaitlistApproved(userId: string): Promise<boolean> {
  const [wlEntry] = await db
    .select({ status: waitlist.status })
    .from(waitlist)
    .where(eq(waitlist.userId, userId));

  if (wlEntry) return wlEntry.status === 'approved';

  // No waitlist entry — allow only grandfathered users (those with an existing profile)
  const [profile] = await db
    .select({ userId: userProfiles.userId })
    .from(userProfiles)
    .where(eq(userProfiles.userId, userId));

  return !!profile;
}
