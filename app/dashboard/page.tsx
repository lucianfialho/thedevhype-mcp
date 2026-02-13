import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';
import { registry } from '../lib/mcp/servers';
import { CopyUrlButton } from './copy-url-button';
import { ToggleServer } from './toggle-server';

export const dynamic = 'force-dynamic';

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
        <ul className="space-y-4">
          {servers.map((server) => {
            const url = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/mcp/${server.name}/mcp`;
            const access = accessByName.get(server.name);
            const enabled = access?.enabled ?? false;

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
                      <ToggleServer mcpName={server.name} enabled={enabled} />
                    </div>
                    <p className="mt-1 text-sm text-zinc-500">
                      {server.description}
                    </p>
                    {enabled && (
                      <code className="mt-3 block truncate rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {url}
                      </code>
                    )}
                  </div>
                  {enabled && <CopyUrlButton url={url} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
