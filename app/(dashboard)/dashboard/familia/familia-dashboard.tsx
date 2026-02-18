'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, TabSelect } from '../components/ui';
import { FeedTab } from './tabs/feed-tab';
import { ShoppingTab } from './tabs/shopping-tab';
import { TasksTab } from './tabs/tasks-tab';
import { NotesTab } from './tabs/notes-tab';
import { ExpensesTab } from './tabs/expenses-tab';
import { MembersTab } from './tabs/members-tab';
import { SettingsTab } from '../eloa/tabs/settings-tab';
import { UserUsageTab } from '../components/user-usage-tab';
import type { UserMcpUsageStats } from '../components/user-mcp-usage';

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'compras', label: 'Shopping' },
  { id: 'tarefas', label: 'Tasks' },
  { id: 'notas', label: 'Notes' },
  { id: 'despesas', label: 'Expenses' },
  { id: 'membros', label: 'Members' },
  { id: 'usage', label: 'Usage' },
  { id: 'config', label: 'Config' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface FamilyInfo {
  id: number;
  name: string;
  description: string | null;
  role: string;
  memberCount: number;
}

interface MemberInfo {
  userId: string;
  role: string;
  nickname: string | null;
  joinedAt: string;
  name: string | null;
  email: string | null;
}

interface ShoppingItemInfo {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  notes: string | null;
  addedByName: string | null;
}

interface TaskInfo {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  assignedToName: string | null;
  assignedToNickname: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NoteInfo {
  id: number;
  title: string;
  content: string | null;
  pinned: boolean;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseInfo {
  id: number;
  description: string;
  amount: string;
  category: string | null;
  date: string;
  splitType: string;
  paidByName: string | null;
  createdAt: string;
}

interface FeedEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: unknown;
  createdAt: string;
  userName: string | null;
  userNickname: string | null;
}

interface InviteInfo {
  id: number;
  familyId: number;
  code: string;
  role: string;
  createdBy: string;
  usedBy: string | null;
  expiresAt: string;
  createdAt: string;
}

interface FamiliaDashboardProps {
  initialTab: Tab;
  families: FamilyInfo[];
  selectedFamilyId: number | null;
  members: MemberInfo[];
  invites: InviteInfo[];
  shopping: { list: { id: number; name: string } | null; items: ShoppingItemInfo[] };
  tasks: TaskInfo[];
  notes: NoteInfo[];
  expenses: ExpenseInfo[];
  balances: { settlements: Array<{ from: string; to: string; amount: string }>; summary: string };
  feed: FeedEntry[];
  counts: { members: number; pendingItems: number; pendingTasks: number; notes: number; totalExpenses: number };
  usageStats: UserMcpUsageStats;
  mcpConfig: {
    mcpUrl: string;
    tools: Array<{ name: string; description: string }>;
    enabled: boolean;
    hasApiKey: boolean;
    maskedApiKey: string | null;
  } | null;
}

export function FamiliaDashboard({
  initialTab,
  families,
  selectedFamilyId,
  members: membersList,
  invites: invitesList,
  shopping,
  tasks: tasksList,
  notes: notesList,
  expenses: expensesList,
  balances,
  feed,
  counts,
  usageStats,
  mcpConfig,
}: FamiliaDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const selectedFamily = families.find((f) => f.id === selectedFamilyId);

  function switchTab(tab: string) {
    setActiveTab(tab as Tab);
    const familyParam = selectedFamilyId ? `&family=${selectedFamilyId}` : '';
    router.push(`/dashboard/familia?tab=${tab}${familyParam}`, { scroll: false });
  }

  function switchFamily(id: number) {
    router.push(`/dashboard/familia?tab=${activeTab}&family=${id}`, { scroll: false });
    router.refresh();
  }

  // Empty state: no family
  if (families.length === 0) {
    return (
      <AppShell title="Familia">
        <div className="mb-4 shrink-0 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl">
            F
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-800">Familia</h2>
            <p className="text-sm text-slate-500">Shared Family Workspace</p>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-violet-100 text-2xl">
            F
          </div>
          <p className="text-base font-medium text-slate-600">No family yet</p>
          <p className="mt-1 text-sm text-slate-500">
            Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">create_family</code> via MCP to create one,
          </p>
          <p className="text-sm text-slate-500">
            or <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">join_family</code> with an invite code.
          </p>
        </div>

        {mcpConfig && (
          <div className="mt-4">
            <SettingsTab
              mcpName="familia"
              mcpUrl={mcpConfig.mcpUrl}
              tools={mcpConfig.tools}
              initialEnabled={mcpConfig.enabled}
              initialHasApiKey={mcpConfig.hasApiKey}
              maskedApiKey={mcpConfig.maskedApiKey}
            />
          </div>
        )}
      </AppShell>
    );
  }

  return (
    <AppShell title="Familia">
      <div className="mb-4 shrink-0 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xl">
          F
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">
            {selectedFamily?.name || 'Familia'}
          </h2>
          <p className="text-sm text-slate-500">
            {counts.members} members
          </p>
        </div>
        <TabSelect
          options={TABS}
          value={activeTab}
          onChange={switchTab}
        />
      </div>

      {/* Family selector if multiple families */}
      {families.length > 1 && (
        <div className="mb-3 flex gap-1.5 overflow-x-auto">
          {families.map((f) => (
            <button
              key={f.id}
              onClick={() => switchFamily(f.id)}
              className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                f.id === selectedFamilyId
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>
      )}

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'feed' && <FeedTab feed={feed} />}
        {activeTab === 'compras' && <ShoppingTab shopping={shopping} />}
        {activeTab === 'tarefas' && <TasksTab tasks={tasksList} />}
        {activeTab === 'notas' && <NotesTab notes={notesList} />}
        {activeTab === 'despesas' && <ExpensesTab expenses={expensesList} balances={balances} />}
        {activeTab === 'membros' && <MembersTab members={membersList} invites={invitesList} />}
        {activeTab === 'usage' && <UserUsageTab stats={usageStats} />}
        {activeTab === 'config' && mcpConfig && (
          <SettingsTab
            mcpName="familia"
            mcpUrl={mcpConfig.mcpUrl}
            tools={mcpConfig.tools}
            initialEnabled={mcpConfig.enabled}
            initialHasApiKey={mcpConfig.hasApiKey}
            maskedApiKey={mcpConfig.maskedApiKey}
          />
        )}
      </div>
    </AppShell>
  );
}
