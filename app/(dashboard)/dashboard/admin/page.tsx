import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userInNeonAuth } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';
import { getUsers, getUserMcpAccess, getApiKeysAdmin, getApiUsageStats, getMcpUsageStats, getWaitlistEntries } from './actions';
import { AdminDashboard } from './admin-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['waitlist', 'usuarios', 'api-keys', 'uso', 'mcps', 'analytics'] as const;
type Tab = (typeof TABS)[number];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'waitlist';

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  if (!userId) redirect('/');

  const [userRecord] = await db
    .select({ role: userInNeonAuth.role })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId));

  if (userRecord?.role !== 'admin') redirect('/dashboard');

  const [users, userMcps, apiKeysData, usageStats, mcpUsageStats, waitlistEntries] = await Promise.all([
    getUsers(),
    getUserMcpAccess(),
    getApiKeysAdmin(),
    getApiUsageStats(),
    getMcpUsageStats(),
    getWaitlistEntries(),
  ]);

  return (
    <AdminDashboard
      initialTab={tab}
      initialUsers={users}
      initialUserMcps={userMcps}
      initialApiKeys={apiKeysData}
      initialUsageStats={usageStats}
      initialMcpUsageStats={mcpUsageStats}
      initialWaitlist={waitlistEntries}
    />
  );
}
