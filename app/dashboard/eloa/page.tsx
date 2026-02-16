import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess, userInNeonAuth } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import { CopyUrlButton } from '../copy-url-button';
import { ToggleServer } from '../toggle-server';
import { getSources, getArticles, getBookmarks, getAllTags, getUnreadCount } from './actions';
import { EloaDashboard } from './eloa-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['feed', 'fontes', 'bookmarks', 'busca', 'analytics'] as const;
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

  const [sourcesData, articlesData, bookmarksData, tagsData, unreadCount, userRecord] = await Promise.all([
    getSources(),
    getArticles(),
    getBookmarks(),
    getAllTags(),
    getUnreadCount(),
    userId
      ? db.select({ role: userInNeonAuth.role }).from(userInNeonAuth).where(eq(userInNeonAuth.id, userId)).then(r => r[0])
      : Promise.resolve(undefined),
  ]);

  const isAdmin = userRecord?.role === 'admin';

  const mcpUrl = 'https://www.thedevhype.com/api/mcp/eloa/mcp';

  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:p-6">
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
        isAdmin={isAdmin}
      />

      {server && (
        <section className="mt-10 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
              MCP Tools
            </h3>
            <ToggleServer
              mcpName="eloa"
              enabled={access?.enabled ?? false}
              hasApiKey={!!access?.apiKey}
            />
          </div>

          {access?.enabled && (
            <>
              <ul className="mb-4 space-y-1">
                {server.tools.map((tool) => (
                  <li key={tool.name} className="flex items-start gap-2 text-xs">
                    <code className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {tool.name}
                    </code>
                    <span className="text-zinc-500">{tool.description}</span>
                  </li>
                ))}
              </ul>

              <div className="space-y-3">
                <div>
                  <span className="text-xs font-medium text-zinc-500">Endpoint</span>
                  <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <code className="block break-all rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700 sm:flex-1 sm:truncate sm:break-normal dark:bg-zinc-800 dark:text-zinc-300">
                      {mcpUrl}
                    </code>
                    <CopyUrlButton url={mcpUrl} />
                  </div>
                </div>
                {access.apiKey && (
                  <div>
                    <span className="text-xs font-medium text-zinc-500">API Key</span>
                    <code className="mt-1 block rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {maskApiKey(access.apiKey)}
                    </code>
                    <p className="mt-1 text-xs text-zinc-400">
                      Use as Bearer token in the Authorization header.
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
