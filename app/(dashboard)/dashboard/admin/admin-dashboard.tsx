'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell, TabSelect } from '../components/ui';
import { UsersTab } from './tabs/users-tab';
import { ApiKeysTab } from './tabs/api-keys-tab';
import { UsageTab } from './tabs/usage-tab';
import { McpsTab } from './tabs/mcps-tab';
import { AnalyticsTab } from './tabs/analytics-tab';
import { WaitlistTab } from './tabs/waitlist-tab';
import { getUsers, getUserMcpAccess, getApiKeysAdmin, getWaitlistEntries } from './actions';
import type { AdminUser, AdminApiKey, ApiUsageStats, UserMcpAccessRow, McpUsageStats, WaitlistEntry } from './actions';

const TABS = [
  { id: 'waitlist', label: 'Waitlist' },
  { id: 'usuarios', label: 'Users' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'uso', label: 'API Usage' },
  { id: 'mcps', label: 'MCPs' },
  { id: 'analytics', label: 'Analytics' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface AdminDashboardProps {
  initialTab: Tab;
  initialUsers: AdminUser[];
  initialUserMcps: UserMcpAccessRow[];
  initialApiKeys: AdminApiKey[];
  initialUsageStats: ApiUsageStats;
  initialMcpUsageStats: McpUsageStats;
  initialWaitlist: WaitlistEntry[];
}

export function AdminDashboard({
  initialTab,
  initialUsers,
  initialUserMcps,
  initialApiKeys,
  initialUsageStats,
  initialMcpUsageStats,
  initialWaitlist,
}: AdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [users, setUsers] = useState(initialUsers);
  const [userMcps, setUserMcps] = useState(initialUserMcps);
  const [apiKeysData, setApiKeysData] = useState(initialApiKeys);
  const [waitlistData, setWaitlistData] = useState(initialWaitlist);

  function switchTab(tab: string) {
    setActiveTab(tab as Tab);
    router.push(`/dashboard/admin?tab=${tab}`, { scroll: false });
  }

  const refreshUsers = useCallback(async () => {
    const [data, mcps] = await Promise.all([getUsers(), getUserMcpAccess()]);
    setUsers(data);
    setUserMcps(mcps);
  }, []);

  const refreshApiKeys = useCallback(async () => {
    const data = await getApiKeysAdmin();
    setApiKeysData(data);
  }, []);

  const refreshWaitlist = useCallback(async () => {
    const data = await getWaitlistEntries();
    setWaitlistData(data);
  }, []);

  return (
    <AppShell title="Admin">
      <div className="mb-4 shrink-0 flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
          A
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">Admin</h2>
        </div>
        <TabSelect options={TABS} value={activeTab} onChange={switchTab} />
      </div>

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'waitlist' && (
          <WaitlistTab entries={waitlistData} onRefresh={refreshWaitlist} />
        )}
        {activeTab === 'usuarios' && (
          <UsersTab users={users} userMcps={userMcps} onRefresh={refreshUsers} />
        )}
        {activeTab === 'api-keys' && (
          <ApiKeysTab apiKeys={apiKeysData} onRefresh={refreshApiKeys} />
        )}
        {activeTab === 'uso' && (
          <UsageTab stats={initialUsageStats} />
        )}
        {activeTab === 'mcps' && (
          <McpsTab stats={initialMcpUsageStats} />
        )}
        {activeTab === 'analytics' && <AnalyticsTab />}
      </div>
    </AppShell>
  );
}
