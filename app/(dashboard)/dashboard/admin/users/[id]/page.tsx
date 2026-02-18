import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userInNeonAuth } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';
import { getUserDetail } from '../../actions';
import { UserDetailView } from './user-detail';

export const dynamic = 'force-dynamic';

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  if (!userId) redirect('/');

  const [userRecord] = await db
    .select({ role: userInNeonAuth.role })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId));

  if (userRecord?.role !== 'admin') redirect('/dashboard');

  const user = await getUserDetail(id);
  if (!user) redirect('/dashboard/admin?tab=usuarios');

  return <UserDetailView user={user} />;
}
