import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import { LucianDashboard } from './lucian-dashboard';
import { getNotas, getNotasSummary, getProdutos, getProdutosSummary, getGastos, getGastosSummary } from './actions';

export const dynamic = 'force-dynamic';

const TABS = ['notas', 'produtos', 'precos', 'gastos', 'config'] as const;
type Tab = (typeof TABS)[number];

function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  return `sk-****${last4}`;
}

export default async function LucianPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'notas';

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  const server = registry.listServers().find((s) => s.name === 'lucian');
  const access = userId
    ? (await db
        .select()
        .from(userMcpAccess)
        .where(and(eq(userMcpAccess.userId, userId), eq(userMcpAccess.mcpName, 'lucian'))))[0]
    : undefined;

  const [notasData, notasSummary, produtosData, produtosSummary, gastosData, gastosSummary] =
    await Promise.all([
      getNotas(),
      getNotasSummary(),
      getProdutos(),
      getProdutosSummary(),
      getGastos(),
      getGastosSummary(),
    ]);

  const mcpConfig = server
    ? {
        mcpUrl: 'https://www.thedevhype.com/api/mcp/lucian/mcp',
        tools: server.tools.map((t) => ({ name: t.name, description: t.description })),
        enabled: access?.enabled ?? false,
        hasApiKey: !!access?.apiKey,
        maskedApiKey: access?.apiKey ? maskApiKey(access.apiKey) : null,
      }
    : null;

  return (
    <main className="mx-auto max-w-4xl px-4 py-4 sm:p-6">
      <div className="mb-6 flex items-center gap-3 sm:gap-4">
        <img
          src="/lucian.png"
          alt="Lucian"
          className="h-10 w-10 shrink-0 rounded-full sm:h-12 sm:w-12"
        />
        <div>
          <h2 className="text-xl font-bold sm:text-2xl">Lucian</h2>
          <p className="text-xs text-zinc-500 sm:text-sm">Gestor de Supermercado Virtual</p>
        </div>
      </div>

      <LucianDashboard
        initialTab={tab}
        initialNotas={notasData}
        notasSummary={notasSummary}
        initialProdutos={produtosData}
        produtosSummary={produtosSummary}
        initialGastos={gastosData}
        gastosSummary={gastosSummary}
        mcpConfig={mcpConfig}
      />
    </main>
  );
}
