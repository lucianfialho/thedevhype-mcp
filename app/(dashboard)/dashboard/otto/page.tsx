import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import { getEntries, getEntryCounts, getAllTags, getGraphData, getUserOttoUsage } from './actions';
import { OttoDashboard } from './otto-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['notas', 'links', 'destaques', 'pessoas', 'empresas', 'graph', 'busca', 'recipes', 'usage', 'config'] as const;
type Tab = (typeof TABS)[number];

function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  return `sk-****${last4}`;
}

export default async function OttoPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'notas';

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  const server = registry.listServers().find((s) => s.name === 'otto');
  const access = userId
    ? (await db
        .select()
        .from(userMcpAccess)
        .where(and(eq(userMcpAccess.userId, userId), eq(userMcpAccess.mcpName, 'otto'))))[0]
    : undefined;

  const [notesData, linksData, highlightsData, peopleData, companiesData, counts, tagsData, graphData, usageStats] = await Promise.all([
    getEntries('note'),
    getEntries('link'),
    getEntries('highlight'),
    getEntries('person'),
    getEntries('company'),
    getEntryCounts(),
    getAllTags(),
    getGraphData(),
    getUserOttoUsage(),
  ]);

  const mcpConfig = server
    ? {
        mcpUrl: 'https://www.thedevhype.com/api/mcp/otto',
        tools: server.tools.map((t) => ({ name: t.name, description: t.description })),
        enabled: access?.enabled ?? false,
        hasApiKey: !!access?.apiKey,
        maskedApiKey: access?.apiKey ? maskApiKey(access.apiKey) : null,
      }
    : null;

  return (
    <OttoDashboard
      initialTab={tab}
      initialNotes={notesData}
      initialLinks={linksData}
      initialHighlights={highlightsData}
      initialPeople={peopleData}
      initialCompanies={companiesData}
      initialCounts={counts}
      initialTags={tagsData}
      initialGraphData={graphData}
      initialUsageStats={usageStats}
      mcpConfig={mcpConfig}
    />
  );
}
