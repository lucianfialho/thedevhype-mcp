import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userMcpAccess } from '@/app/lib/db/public.schema';
import { eq, and } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import {
  getUserFamilies,
  getFamilyMembers,
  getFamilyInvites,
  getShoppingItems,
  getFamilyTasks,
  getFamilyNotes,
  getFamilyExpenses,
  getExpenseBalances,
  getFamilyFeed,
  getFamilyCounts,
  getUserFamiliaUsage,
} from './actions';
import { FamiliaDashboard } from './familia-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['feed', 'compras', 'tarefas', 'notas', 'despesas', 'membros', 'recipes', 'usage', 'config'] as const;
type Tab = (typeof TABS)[number];

function maskApiKey(key: string): string {
  const last4 = key.slice(-4);
  return `sk-****${last4}`;
}

export default async function FamiliaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; family?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'feed';

  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;

  const server = registry.listServers().find((s) => s.name === 'familia');
  const access = userId
    ? (await db
        .select()
        .from(userMcpAccess)
        .where(and(eq(userMcpAccess.userId, userId), eq(userMcpAccess.mcpName, 'familia'))))[0]
    : undefined;

  let userFamilies: Awaited<ReturnType<typeof getUserFamilies>> = [];
  try {
    userFamilies = await getUserFamilies();
  } catch {
    // Schema may not exist yet — treat as no families
  }

  // No family: show empty state
  if (userFamilies.length === 0) {
    const mcpConfig = server
      ? {
          mcpUrl: 'https://www.thedevhype.com/api/mcp/familia',
          tools: server.tools.map((t) => ({ name: t.name, description: t.description })),
          enabled: access?.enabled ?? false,
          hasApiKey: !!access?.apiKey,
          maskedApiKey: access?.apiKey ? maskApiKey(access.apiKey) : null,
        }
      : null;

    return (
      <FamiliaDashboard
        initialTab={tab}
        families={[]}
        selectedFamilyId={null}
        members={[]}
        invites={[]}
        shopping={{ list: null, items: [] }}
        tasks={[]}
        notes={[]}
        expenses={[]}
        balances={{ settlements: [], summary: 'All settled!' }}
        feed={[]}
        counts={{ members: 0, pendingItems: 0, pendingTasks: 0, notes: 0, totalExpenses: 0 }}
        usageStats={{ totalCalls: { today: 0, week: 0, month: 0 }, byTool: [], errors: 0 }}
        mcpConfig={mcpConfig}
      />
    );
  }

  // Select family
  const selectedId = params.family ? parseInt(params.family, 10) : userFamilies[0].id;
  const selectedFamily = userFamilies.find((f) => f.id === selectedId) || userFamilies[0];

  let membersList: Awaited<ReturnType<typeof getFamilyMembers>> = [];
  let invitesList: Awaited<ReturnType<typeof getFamilyInvites>> = [];
  let shoppingData: Awaited<ReturnType<typeof getShoppingItems>> = { list: null, items: [] };
  let tasksList: Awaited<ReturnType<typeof getFamilyTasks>> = [];
  let notesList: Awaited<ReturnType<typeof getFamilyNotes>> = [];
  let expensesList: Awaited<ReturnType<typeof getFamilyExpenses>> = [];
  let balancesData: Awaited<ReturnType<typeof getExpenseBalances>> = { settlements: [], summary: 'All settled!' };
  let feedData: Awaited<ReturnType<typeof getFamilyFeed>> = [];
  let countsData: Awaited<ReturnType<typeof getFamilyCounts>> = { members: 0, pendingItems: 0, pendingTasks: 0, notes: 0, totalExpenses: 0 };
  let usageStats: Awaited<ReturnType<typeof getUserFamiliaUsage>> = { totalCalls: { today: 0, week: 0, month: 0 }, byTool: [], errors: 0 };

  try {
    [membersList, invitesList, shoppingData, tasksList, notesList, expensesList, balancesData, feedData, countsData, usageStats] =
      await Promise.all([
        getFamilyMembers(selectedFamily.id),
        getFamilyInvites(selectedFamily.id),
        getShoppingItems(selectedFamily.id),
        getFamilyTasks(selectedFamily.id),
        getFamilyNotes(selectedFamily.id),
        getFamilyExpenses(selectedFamily.id),
        getExpenseBalances(selectedFamily.id),
        getFamilyFeed(selectedFamily.id),
        getFamilyCounts(selectedFamily.id),
        getUserFamiliaUsage(),
      ]);
  } catch {
    // Schema tables may not exist yet — use defaults
  }

  const mcpConfig = server
    ? {
        mcpUrl: 'https://www.thedevhype.com/api/mcp/familia',
        tools: server.tools.map((t) => ({ name: t.name, description: t.description })),
        enabled: access?.enabled ?? false,
        hasApiKey: !!access?.apiKey,
        maskedApiKey: access?.apiKey ? maskApiKey(access.apiKey) : null,
      }
    : null;

  return (
    <FamiliaDashboard
      initialTab={tab}
      families={userFamilies}
      selectedFamilyId={selectedFamily.id}
      members={membersList}
      invites={invitesList}
      shopping={shoppingData}
      tasks={tasksList}
      notes={notesList}
      expenses={expensesList}
      balances={balancesData}
      feed={feedData}
      counts={countsData}
      usageStats={usageStats}
      mcpConfig={mcpConfig}
    />
  );
}
