import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userInNeonAuth } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';
import { getUsers, getUserMcpAccess, getApiKeysAdmin, getApiUsageStats, getMcpUsageStats } from './actions';
import { AdminDashboard } from './admin-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['usuarios', 'api-keys', 'uso', 'mcps'] as const;
type Tab = (typeof TABS)[number];

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'usuarios';

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  if (!userId) redirect('/');

  const [userRecord] = await db
    .select({ role: userInNeonAuth.role })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId));

  if (userRecord?.role !== 'admin') redirect('/dashboard');

  const [users, userMcps, apiKeysData, usageStats, mcpUsageStats] = await Promise.all([
    getUsers(),
    getUserMcpAccess(),
    getApiKeysAdmin(),
    getApiUsageStats(),
    getMcpUsageStats(),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-4 sm:p-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3L5 8l5 5" />
        </svg>
        Back
      </Link>
      <div className="mb-6">
        <h2 className="text-xl font-bold sm:text-2xl">Admin</h2>
        <p className="text-xs text-zinc-500 sm:text-sm">Gerenciar usuarios, API keys e uso</p>
      </div>

      <AdminDashboard
        initialTab={tab}
        initialUsers={users}
        initialUserMcps={userMcps}
        initialApiKeys={apiKeysData}
        initialUsageStats={usageStats}
        initialMcpUsageStats={mcpUsageStats}
      />
    </main>
  );
}
