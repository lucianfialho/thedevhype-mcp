import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import { CopyUrlButton } from '../copy-url-button';
import { getSources, getArticles, getBookmarks, getAllTags } from './actions';
import { EloaDashboard } from './eloa-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['feed', 'fontes', 'bookmarks', 'busca'] as const;
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

  const [sourcesData, articlesData, bookmarksData, tagsData] = await Promise.all([
    getSources(),
    getArticles(),
    getBookmarks(),
    getAllTags(),
  ]);

  const mcpUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/mcp/eloa/mcp`;

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <img
          src="/eloa.png"
          alt="Eloa"
          className="h-12 w-12 rounded-full"
        />
        <div>
          <h2 className="text-2xl font-bold">Eloa</h2>
          <p className="text-sm text-zinc-500">AI Content Curator</p>
        </div>
        <kbd className="ml-auto rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-400 dark:border-zinc-700">
          {'\u2318'}K
        </kbd>
      </div>

      <EloaDashboard
        initialTab={tab}
        initialSources={sourcesData}
        initialArticles={articlesData}
        initialBookmarks={bookmarksData}
        initialTags={tagsData}
      />

      {server && access?.enabled && (
        <section className="mt-10 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
            MCP Tools
          </h3>

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
              <div className="mt-1 flex items-center gap-2">
                <code className="block flex-1 truncate rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
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
        </section>
      )}
    </main>
  );
}
