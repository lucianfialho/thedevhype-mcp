'use client';

import { useState } from 'react';
import { SettingsTab } from '../eloa/tabs/settings-tab';

const TABS = [
  { id: 'config', label: 'Configuracoes' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface LucianDashboardProps {
  initialTab: Tab;
  mcpConfig: {
    mcpUrl: string;
    tools: Array<{ name: string; description: string }>;
    enabled: boolean;
    hasApiKey: boolean;
    maskedApiKey: string | null;
  } | null;
}

export function LucianDashboard({
  initialTab,
  mcpConfig,
}: LucianDashboardProps) {
  const [activeTab] = useState<Tab>(initialTab);

  return (
    <>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 whitespace-nowrap rounded-md px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${
              activeTab === tab.id
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'config' && mcpConfig && (
        <SettingsTab
          mcpName="lucian"
          mcpUrl={mcpConfig.mcpUrl}
          tools={mcpConfig.tools}
          initialEnabled={mcpConfig.enabled}
          initialHasApiKey={mcpConfig.hasApiKey}
          maskedApiKey={mcpConfig.maskedApiKey}
        />
      )}
    </>
  );
}
