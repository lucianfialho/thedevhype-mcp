import { auth } from '@/app/lib/auth/server';
import { registry } from '../lib/mcp/servers';
import { CopyUrlButton } from './copy-url-button';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  const servers = registry.listServers();

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
            return (
              <li
                key={server.name}
                className="rounded-lg border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold">{server.name}</h3>
                    <p className="mt-1 text-sm text-zinc-500">
                      {server.description}
                    </p>
                    <code className="mt-3 block truncate rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                      {url}
                    </code>
                  </div>
                  <CopyUrlButton url={url} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
