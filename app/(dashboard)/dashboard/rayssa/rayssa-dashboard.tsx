'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, TabSelect } from '../components/ui';
import { ComposeTab } from './tabs/compose-tab';
import { DraftsTab } from './tabs/drafts-tab';
import { ScheduledTab } from './tabs/scheduled-tab';
import { PublishedTab } from './tabs/published-tab';
import { AccountsTab } from './tabs/accounts-tab';
import { SettingsTab } from '../eloa/tabs/settings-tab';
import { RecipesTab, RAYSSA_RECIPES } from '../components/recipes-tab';
import { UserUsageTab } from '../components/user-usage-tab';
import type { UserMcpUsageStats } from '../components/user-mcp-usage';
import type { Post } from '@/app/lib/mcp/servers/rayssa.schema';

const TABS = [
  { id: 'compose', label: 'Compose' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'accounts', label: 'Accounts' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'usage', label: 'Usage' },
  { id: 'config', label: 'Config' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface Account {
  id: number;
  platform: string;
  username: string | null;
  displayName: string | null;
  createdAt: string;
}

interface RayssaDashboardProps {
  initialTab: Tab;
  initialAccounts: Account[];
  initialDrafts: Post[];
  initialScheduled: Post[];
  initialPublished: Post[];
  initialUsageStats: UserMcpUsageStats;
  mcpConfig: {
    mcpUrl: string;
    tools: Array<{ name: string; description: string }>;
    enabled: boolean;
    hasApiKey: boolean;
    maskedApiKey: string | null;
  } | null;
  oauthError: string | null;
}

export function RayssaDashboard({
  initialTab,
  initialAccounts,
  initialDrafts,
  initialScheduled,
  initialPublished,
  initialUsageStats,
  mcpConfig,
  oauthError,
}: RayssaDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [drafts, setDrafts] = useState(initialDrafts);
  const [scheduled, setScheduled] = useState(initialScheduled);
  const [published, setPublished] = useState(initialPublished);

  function switchTab(tab: string) {
    setActiveTab(tab as Tab);
    router.push(`/dashboard/rayssa?tab=${tab}`, { scroll: false });
  }

  return (
    <AppShell title="Rayssa">
      <div className="mb-4 shrink-0 flex items-center gap-3">
        <img src="/rayssa.png" alt="Rayssa" className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">Rayssa</h2>
          <p className="text-sm text-slate-500">Social Publisher</p>
        </div>
        <TabSelect
          options={TABS}
          value={activeTab}
          onChange={switchTab}
          badge={{ id: 'drafts', count: drafts.length }}
        />
      </div>

      {accounts.length === 0 && activeTab !== 'accounts' && activeTab !== 'config' && activeTab !== 'recipes' && activeTab !== 'usage' && (
        <button
          onClick={() => switchTab('accounts')}
          className="cursor-pointer mb-4 flex w-full items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-left transition-colors hover:bg-sky-100"
        >
          <span className="text-lg">🔗</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-sky-800">Connect a social account first</p>
            <p className="text-xs text-sky-600">Link your X or LinkedIn account to start publishing.</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-sky-400">
            <path d="M6 4l4 4-4 4" />
          </svg>
        </button>
      )}

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'compose' && (
          <ComposeTab
            accounts={accounts}
            onPostCreated={(post) => setDrafts((prev) => [post, ...prev])}
          />
        )}
        {activeTab === 'drafts' && (
          <DraftsTab
            drafts={drafts}
            onDraftsChange={setDrafts}
            onScheduled={(post) => setScheduled((prev) => [post, ...prev])}
            onPublished={(post) => setPublished((prev) => [post, ...prev])}
          />
        )}
        {activeTab === 'scheduled' && (
          <ScheduledTab
            scheduled={scheduled}
            onScheduledChange={setScheduled}
            onUnscheduled={(post) => setDrafts((prev) => [post, ...prev])}
            onPublished={(post) => setPublished((prev) => [post, ...prev])}
          />
        )}
        {activeTab === 'published' && <PublishedTab published={published} />}
        {activeTab === 'accounts' && (
          <AccountsTab
            accounts={accounts}
            onAccountsChange={setAccounts}
            oauthError={oauthError}
          />
        )}
        {activeTab === 'recipes' && <RecipesTab recipes={RAYSSA_RECIPES} mcpName="Rayssa" />}
        {activeTab === 'usage' && <UserUsageTab stats={initialUsageStats} />}
        {activeTab === 'config' && mcpConfig && (
          <SettingsTab
            mcpName="rayssa"
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
