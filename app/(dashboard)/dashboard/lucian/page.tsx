import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess, apiKeys } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import { LucianDashboard } from './lucian-dashboard';
import { getProdutosWithPrices, getProdutosSummary, getGastosData, getGastosTrend, getActiveList, getListSummary, getUserLucianUsage } from './actions';

export const dynamic = 'force-dynamic';

const TABS = ['gastos', 'produtos', 'lista', 'usage', 'config'] as const;
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
  const tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'gastos';

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  const server = registry.listServers().find((s) => s.name === 'lucian');
  const access = userId
    ? (await db
        .select()
        .from(userMcpAccess)
        .where(and(eq(userMcpAccess.userId, userId), eq(userMcpAccess.mcpName, 'lucian'))))[0]
    : undefined;

  const [produtosData, produtosSummary, gastosResult, gastosTrendData, listItems, listSummaryData, userApiKey, usageStats] =
    await Promise.all([
      getProdutosWithPrices(),
      getProdutosSummary(),
      getGastosData(),
      getGastosTrend(),
      getActiveList(),
      getListSummary(),
      userId
        ? db.select({ key: apiKeys.key, defaultState: apiKeys.defaultState })
            .from(apiKeys)
            .where(eq(apiKeys.userId, userId))
            .limit(1)
            .then(r => r[0])
        : Promise.resolve(undefined),
      getUserLucianUsage(),
    ]);

  const mcpConfig = server
    ? {
        mcpUrl: 'https://www.thedevhype.com/api/mcp/lucian',
        tools: server.tools.map((t) => ({ name: t.name, description: t.description })),
        enabled: access?.enabled ?? false,
        hasApiKey: !!access?.apiKey,
        maskedApiKey: access?.apiKey ? maskApiKey(access.apiKey) : null,
        contributePublicData: access?.contributePublicData ?? false,
        defaultState: userApiKey?.defaultState ?? null,
        publicApiKey: userApiKey?.key ?? null,
      }
    : null;

  return (
    <LucianDashboard
      initialTab={tab}
      initialProdutos={produtosData}
      produtosSummary={produtosSummary}
      initialGastos={gastosResult.gastos}
      gastosSummary={gastosResult.summary}
      gastosTrendData={gastosTrendData}
      initialListItems={listItems}
      listSummary={listSummaryData}
      mcpConfig={mcpConfig}
      initialUsageStats={usageStats}
    />
  );
}
