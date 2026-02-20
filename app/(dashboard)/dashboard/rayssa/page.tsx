import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import { getAccounts, getAllPosts, getUserRayssaUsage } from './actions';
import { RayssaDashboard } from './rayssa-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['compose', 'drafts', 'scheduled', 'published', 'accounts', 'recipes', 'usage', 'config'] as const;
type Tab = (typeof TABS)[number];

function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  return `sk-****${last4}`;
}

export default async function RayssaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; error?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'compose';

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  const server = registry.listServers().find((s) => s.name === 'rayssa');
  const access = userId
    ? (await db
        .select()
        .from(userMcpAccess)
        .where(and(eq(userMcpAccess.userId, userId), eq(userMcpAccess.mcpName, 'rayssa'))))[0]
    : undefined;

  const [accountsData, postsData, usageStats] = await Promise.all([
    getAccounts(),
    getAllPosts(),
    getUserRayssaUsage(),
  ]);

  const mcpConfig = server
    ? {
        mcpUrl: 'https://www.thedevhype.com/api/mcp/rayssa',
        tools: server.tools.map((t) => ({ name: t.name, description: t.description })),
        enabled: access?.enabled ?? false,
        hasApiKey: !!access?.apiKey,
        maskedApiKey: access?.apiKey ? maskApiKey(access.apiKey) : null,
      }
    : null;

  return (
    <RayssaDashboard
      initialTab={tab}
      initialAccounts={accountsData}
      initialDrafts={postsData.drafts}
      initialScheduled={postsData.scheduled}
      initialPublished={postsData.published}
      initialUsageStats={usageStats}
      mcpConfig={mcpConfig}
      oauthError={params.error || null}
    />
  );
}
