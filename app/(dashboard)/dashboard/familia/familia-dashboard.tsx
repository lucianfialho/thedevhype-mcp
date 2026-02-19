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
import { RecipesTab, FAMILIA_RECIPES } from '../components/recipes-tab';
import { createFamily, joinFamily } from './actions';
import type { UserMcpUsageStats } from '../components/user-mcp-usage';

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'compras', label: 'Compras' },
  { id: 'tarefas', label: 'Tarefas' },
  { id: 'notas', label: 'Notas' },
  { id: 'despesas', label: 'Despesas' },
  { id: 'membros', label: 'Membros' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'usage', label: 'Usage' },
  { id: 'config', label: 'Config' },
] as const;

type Tab = (typeof TABS)[number]['id'];

function HomeSvg({ className }: { className?: string }) {
  return (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

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

  // Promote to state for optimistic updates
  const [shoppingItems, setShoppingItems] = useState(shopping.items);
  const [shoppingList, setShoppingList] = useState(shopping.list);
  const [tasksState, setTasksState] = useState(tasksList);
  const [notesState, setNotesState] = useState(notesList);
  const [expensesState, setExpensesState] = useState(expensesList);
  const [feedState, setFeedState] = useState(feed);
  const [invitesState, setInvitesState] = useState(invitesList);

  const selectedFamily = families.find((f) => f.id === selectedFamilyId);
  const currentUserRole = selectedFamily?.role || 'member';

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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100">
            <HomeSvg className="h-5 w-5 text-violet-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-slate-800">Familia</h2>
            <p className="text-sm text-slate-500">Espaço compartilhado da família</p>
          </div>
        </div>

        <EmptyStateForms mcpConfig={mcpConfig} />
      </AppShell>
    );
  }

  return (
    <AppShell title="Familia">
      <div className="mb-4 shrink-0 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-100">
          <HomeSvg className="h-5 w-5 text-violet-600" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">
            {selectedFamily?.name || 'Familia'}
          </h2>
          <p className="text-sm text-slate-500">
            {counts.members} membros
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

      {/* Counters bar */}
      {activeTab === 'feed' && (
        <div className="mb-4 grid grid-cols-4 gap-2">
          <CounterCard
            label="Compras"
            count={shoppingItems.filter((i) => !i.checked).length}
            onClick={() => switchTab('compras')}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></svg>}
          />
          <CounterCard
            label="Tarefas"
            count={tasksState.filter((t) => t.status !== 'done').length}
            onClick={() => switchTab('tarefas')}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>}
          />
          <CounterCard
            label="Notas"
            count={notesState.length}
            onClick={() => switchTab('notas')}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>}
          />
          <CounterCard
            label="Membros"
            count={membersList.length}
            onClick={() => switchTab('membros')}
            icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>}
          />
        </div>
      )}

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'feed' && (
          <FeedTab
            feed={feedState}
            familyId={selectedFamilyId!}
            onFeedChange={setFeedState}
          />
        )}
        {activeTab === 'compras' && (
          <ShoppingTab
            shopping={{ list: shoppingList, items: shoppingItems }}
            familyId={selectedFamilyId!}
            onShoppingChange={(items, list) => {
              setShoppingItems(items);
              if (list !== undefined) setShoppingList(list);
            }}
          />
        )}
        {activeTab === 'tarefas' && (
          <TasksTab
            tasks={tasksState}
            familyId={selectedFamilyId!}
            members={membersList}
            onTasksChange={setTasksState}
          />
        )}
        {activeTab === 'notas' && (
          <NotesTab
            notes={notesState}
            familyId={selectedFamilyId!}
            onNotesChange={setNotesState}
          />
        )}
        {activeTab === 'despesas' && (
          <ExpensesTab
            expenses={expensesState}
            balances={balances}
            familyId={selectedFamilyId!}
            onExpensesChange={setExpensesState}
          />
        )}
        {activeTab === 'membros' && (
          <MembersTab
            members={membersList}
            invites={invitesState}
            familyId={selectedFamilyId!}
            currentUserRole={currentUserRole}
            onInvitesChange={setInvitesState}
          />
        )}
        {activeTab === 'recipes' && <RecipesTab recipes={FAMILIA_RECIPES} mcpName="Familia" />}
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

// ─── Empty State Forms ───

function CounterCard({
  label,
  count,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 px-2 py-3 transition-colors hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-center gap-1.5 text-slate-400">
        {icon}
      </div>
      <span className="text-lg font-bold text-slate-800">{count}</span>
      <span className="text-[11px] text-slate-500">{label}</span>
    </button>
  );
}

function EmptyStateForms({
  mcpConfig,
}: {
  mcpConfig: FamiliaDashboardProps['mcpConfig'];
}) {
  const router = useRouter();
  const [familyName, setFamilyName] = useState('');
  const [familyDesc, setFamilyDesc] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) return;
    setCreating(true);
    setError('');
    const res = await createFamily(familyName.trim(), familyDesc.trim() || undefined);
    if (res.error) {
      setError(res.error);
      setCreating(false);
    } else {
      router.refresh();
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoining(true);
    setError('');
    const res = await joinFamily(inviteCode.trim());
    if (res.error) {
      setError(res.error);
      setJoining(false);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Create family */}
      <div className="rounded-2xl border border-slate-200 p-5">
        <h3 className="mb-3 text-base font-semibold text-slate-800">Criar família</h3>
        <form onSubmit={handleCreate} className="space-y-3">
          <input
            type="text"
            placeholder="Nome da família"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            required
          />
          <input
            type="text"
            placeholder="Descrição (opcional)"
            value={familyDesc}
            onChange={(e) => setFamilyDesc(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={creating || !familyName.trim()}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {creating ? 'Criando...' : 'Criar família'}
          </button>
        </form>
      </div>

      {/* Join family */}
      <div className="rounded-2xl border border-dashed border-slate-200 p-5">
        <h3 className="mb-3 text-base font-semibold text-slate-800">Entrar com código</h3>
        <form onSubmit={handleJoin} className="space-y-3">
          <input
            type="text"
            placeholder="Código de convite"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            required
          />
          <button
            type="submit"
            disabled={joining || !inviteCode.trim()}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {joining ? 'Entrando...' : 'Entrar na família'}
          </button>
        </form>
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
    </div>
  );
}
