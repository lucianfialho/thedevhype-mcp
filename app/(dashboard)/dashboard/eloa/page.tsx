import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import { getSources, getArticles, getBookmarks, getAllTags, getUnreadCount, getUserEloaUsage } from './actions';
import { EloaDashboard } from './eloa-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['feed', 'fontes', 'bookmarks', 'busca', 'recipes', 'usage', 'config'] as const;
type Tab = (typeof TABS)[number];

function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  return `sk-****${last4}`;
}

export default async function EloaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'feed';

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  const server = registry.listServers().find((s) => s.name === 'eloa');
  const access = userId
    ? (await db
        .select()
        .from(userMcpAccess)
        .where(and(eq(userMcpAccess.userId, userId), eq(userMcpAccess.mcpName, 'eloa'))))[0]
    : undefined;

  const [sourcesData, articlesData, bookmarksData, tagsData, unreadCount, usageStats] = await Promise.all([
    getSources(),
    getArticles(),
    getBookmarks(),
    getAllTags(),
    getUnreadCount(),
    getUserEloaUsage(),
  ]);

  const mcpConfig = server
    ? {
        mcpUrl: 'https://www.thedevhype.com/api/mcp/eloa',
        tools: server.tools.map((t) => ({ name: t.name, description: t.description })),
        enabled: access?.enabled ?? false,
        hasApiKey: !!access?.apiKey,
        maskedApiKey: access?.apiKey ? maskApiKey(access.apiKey) : null,
      }
    : null;

  return (
    <EloaDashboard
      initialTab={tab}
      initialSources={sourcesData}
      initialArticles={articlesData}
      initialBookmarks={bookmarksData}
      initialTags={tagsData}
      initialUnreadCount={unreadCount}
      initialUsageStats={usageStats}
      mcpConfig={mcpConfig}
    />
  );
}
