'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UsersTab } from './tabs/users-tab';
import { ApiKeysTab } from './tabs/api-keys-tab';
import { UsageTab } from './tabs/usage-tab';
import { McpsTab } from './tabs/mcps-tab';
import { getUsers, getUserMcpAccess, getApiKeysAdmin } from './actions';
import type { AdminUser, AdminApiKey, ApiUsageStats, UserMcpAccessRow, McpUsageStats } from './actions';

const TABS = [
  { id: 'usuarios', label: 'Usuarios' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'uso', label: 'Uso da API' },
  { id: 'mcps', label: 'MCPs' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface AdminDashboardProps {
  initialTab: Tab;
  initialUsers: AdminUser[];
  initialUserMcps: UserMcpAccessRow[];
  initialApiKeys: AdminApiKey[];
  initialUsageStats: ApiUsageStats;
  initialMcpUsageStats: McpUsageStats;
}

export function AdminDashboard({
  initialTab,
  initialUsers,
  initialUserMcps,
  initialApiKeys,
  initialUsageStats,
  initialMcpUsageStats,
}: AdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [users, setUsers] = useState(initialUsers);
  const [userMcps, setUserMcps] = useState(initialUserMcps);
  const [apiKeysData, setApiKeysData] = useState(initialApiKeys);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
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

  return (
    <>
      {/* Tab bar */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-700 dark:bg-zinc-800/50">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
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
    </>
  );
}
