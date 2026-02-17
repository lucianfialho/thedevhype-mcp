import Link from 'next/link';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import { getSources, getArticles, getBookmarks, getAllTags, getUnreadCount, getUserEloaUsage } from './actions';
import { EloaDashboard } from './eloa-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['feed', 'fontes', 'bookmarks', 'busca', 'usage', 'config'] as const;
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
        mcpUrl: 'https://www.thedevhype.com/api/mcp/eloa/mcp',
        tools: server.tools.map((t) => ({ name: t.name, description: t.description })),
        enabled: access?.enabled ?? false,
        hasApiKey: !!access?.apiKey,
        maskedApiKey: access?.apiKey ? maskApiKey(access.apiKey) : null,
      }
    : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:p-6">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M10 3L5 8l5 5" />
        </svg>
        Back
      </Link>
      <div className="mb-6 flex items-center gap-3 sm:gap-4">
        <img
          src="/eloa.png"
          alt="Eloa"
          className="h-10 w-10 shrink-0 rounded-full sm:h-12 sm:w-12"
        />
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Eloa</h2>
          <p className="text-xs text-zinc-500 sm:text-sm">AI Content Curator</p>
        </div>
        <kbd className="ml-auto hidden rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-400 sm:block dark:border-zinc-700">
          {'\u2318'}K
        </kbd>
      </div>

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
    </main>
  );
}
