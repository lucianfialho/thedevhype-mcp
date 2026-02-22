import { Resend } from 'resend';
import { db } from '@/app/lib/db';
import { userInNeonAuth, waitlist } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';

let resend: Resend;
function getResend() {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY);
  return resend;
}

const FROM_EMAIL = 'TheDevHype <noreply@thedevhype.com>';

export async function sendEmail({
  to,
  subject,
  react,
}: {
  to: string;
  subject: string;
  react: React.ReactElement;
}) {
  try {
    await getResend().emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      react,
    });
  } catch (err) {
    console.error('[email] Failed to send:', subject, err);
  }
}

export async function getUserInfo(userId: string) {
  const [user] = await db
    .select({ email: userInNeonAuth.email, name: userInNeonAuth.name })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId));
  return user ?? null;
}

export async function getWaitlistUserInfo(waitlistId: number) {
  const [row] = await db
    .select({ email: userInNeonAuth.email, name: userInNeonAuth.name })
    .from(waitlist)
    .innerJoin(userInNeonAuth, eq(waitlist.userId, userInNeonAuth.id))
    .where(eq(waitlist.id, waitlistId));
  return row ?? null;
}
