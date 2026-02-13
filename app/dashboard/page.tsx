import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';
import { registry } from '../lib/mcp/servers';
import { CopyUrlButton } from './copy-url-button';
import { ToggleServer } from './toggle-server';

export const dynamic = 'force-dynamic';

function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  return `sk-****${last4}`;
}

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  const servers = registry.listServers();

  const accessRows = user
    ? await db
        .select()
        .from(userMcpAccess)
        .where(eq(userMcpAccess.userId, user.id))
    : [];

  const accessByName = new Map(accessRows.map((r) => [r.mcpName, r]));

  const categories = new Map<string, typeof servers>();
  for (const server of servers) {
    const list = categories.get(server.category) ?? [];
    list.push(server);
    categories.set(server.category, list);
  }

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">MCP Servers</h2>
        <p className="mt-1 text-zinc-500">
          {user?.name ? `Welcome, ${user.name}.` : 'Welcome.'} Connect any MCP
          server below to your AI client.
        </p>
      </div>

      {servers.length === 0 ? (
        <p className="text-zinc-400">No MCP servers available.</p>
      ) : (
        <div className="space-y-8">
          {Array.from(categories.entries()).map(([category, categoryServers]) => (
            <section key={category}>
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-400">
                {category}
              </h3>
              <ul className="space-y-4">
                {categoryServers.map((server) => {
                  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/mcp/${server.name}/mcp`;
                  const access = accessByName.get(server.name);
                  const enabled = access?.enabled ?? false;
                  const maskedKey = access?.apiKey ? maskApiKey(access.apiKey) : null;

                  return (
                    <li
                      key={server.name}
                      className={`rounded-lg border p-5 transition-opacity ${
                        enabled
                          ? 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
                          : 'border-zinc-100 bg-zinc-50 opacity-60 dark:border-zinc-800/50 dark:bg-zinc-900/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-lg font-semibold">{server.name}</h3>
                            <ToggleServer mcpName={server.name} enabled={enabled} hasApiKey={!!access?.apiKey} />
                          </div>
                          <p className="mt-1 text-sm text-zinc-500">
                            {server.description}
                          </p>

                          {server.tools.length > 0 && (
                            <div className="mt-3">
                              <span className="text-xs font-medium text-zinc-500">Available tools</span>
                              <ul className="mt-1 space-y-1">
                                {server.tools.map((tool) => (
                                  <li key={tool.name} className="flex items-start gap-2 text-xs">
                                    <code className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                      {tool.name}
                                    </code>
                                    <span className="text-zinc-500">{tool.description}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {enabled && (
                            <div className="mt-3 space-y-2">
                              <div>
                                <span className="text-xs font-medium text-zinc-500">Endpoint</span>
                                <code className="mt-1 block truncate rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                  {url}
                                </code>
                              </div>
                              {maskedKey && (
                                <div>
                                  <span className="text-xs font-medium text-zinc-500">API Key</span>
                                  <code className="mt-1 block rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                    {maskedKey}
                                  </code>
                                  <p className="mt-1 text-xs text-zinc-400">
                                    Use as Bearer token in the Authorization header.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        {enabled && <CopyUrlButton url={url} />}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
