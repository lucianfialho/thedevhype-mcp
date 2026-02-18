'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell, TabSelect } from '../components/ui';
import { SettingsTab } from '../eloa/tabs/settings-tab';
import { ProdutosTab } from './tabs/produtos-tab';
import { GastosTab } from './tabs/gastos-tab';
import type { GastosTrendData } from './tabs/gastos-trend-chart';
import { ListaTab } from './tabs/lista-tab';
import { UserUsageTab } from '../components/user-usage-tab';
import type { UserMcpUsageStats } from '../components/user-mcp-usage';

const TABS = [
  { id: 'gastos', label: 'Spending' },
  { id: 'produtos', label: 'Products' },
  { id: 'lista', label: 'Shopping List' },
  { id: 'usage', label: 'Usage' },
  { id: 'config', label: 'Config' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface LucianDashboardProps {
  initialTab: Tab;
  initialProdutos: Array<{
    id: number;
    codigo: string;
    nome: string;
    unidade: string | null;
    categoria: string | null;
    storeId: number;
    storeName: string;
    minPrice: number | null;
    maxPrice: number | null;
    avgPrice: number | null;
    entryCount: number;
  }>;
  produtosSummary: {
    total: number;
    comCategoria: number;
    semCategoria: number;
    categorias: string[];
  };
  initialGastos: Array<{
    label: string;
    total: number;
    percentual: number;
  }>;
  gastosSummary: {
    totalGeral: number;
    comprasCount: number;
    mediaCompra: number;
  };
  gastosTrendData: GastosTrendData;
  initialListItems: Array<{
    id: number;
    name: string;
    quantity: string | null;
    unit: string | null;
    estimatedPrice: string | null;
    cheapestStore: string | null;
    checked: boolean;
    notes: string | null;
    createdAt: string;
  }>;
  listSummary: {
    totalItems: number;
    checkedItems: number;
    estimatedTotal: number;
  };
  mcpConfig: {
    mcpUrl: string;
    tools: Array<{ name: string; description: string }>;
    enabled: boolean;
    hasApiKey: boolean;
    maskedApiKey: string | null;
    contributePublicData: boolean;
    defaultState: string | null;
    publicApiKey: string | null;
  } | null;
  initialUsageStats: UserMcpUsageStats;
}

export function LucianDashboard({
  initialTab,
  initialProdutos,
  produtosSummary,
  initialGastos,
  gastosSummary,
  gastosTrendData,
  initialListItems,
  listSummary,
  mcpConfig,
  initialUsageStats,
}: LucianDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  function switchTab(tab: string) {
    setActiveTab(tab as Tab);
    router.push(`/dashboard/lucian?tab=${tab}`, { scroll: false });
  }

  return (
    <AppShell title="Lucian">
      <div className="mb-4 shrink-0 flex items-center gap-3">
        <img src="/lucian.png" alt="Lucian" className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">Lucian</h2>
          <p className="text-sm text-slate-500">Virtual Grocery Manager</p>
        </div>
        <TabSelect options={TABS} value={activeTab} onChange={switchTab} />
      </div>

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'produtos' && (
          <ProdutosTab initialProdutos={initialProdutos} summary={produtosSummary} />
        )}
        {activeTab === 'gastos' && (
          <GastosTab initialGastos={initialGastos} initialSummary={gastosSummary} trendData={gastosTrendData} />
        )}
        {activeTab === 'lista' && (
          <ListaTab initialItems={initialListItems} initialSummary={listSummary} />
        )}
        {activeTab === 'usage' && <UserUsageTab stats={initialUsageStats} />}
        {activeTab === 'config' && mcpConfig && (
          <SettingsTab
            mcpName="lucian"
            mcpUrl={mcpConfig.mcpUrl}
            tools={mcpConfig.tools}
            initialEnabled={mcpConfig.enabled}
            initialHasApiKey={mcpConfig.hasApiKey}
            maskedApiKey={mcpConfig.maskedApiKey}
            showContributeToggle
            initialContribute={mcpConfig.contributePublicData}
            showDefaultState
            initialDefaultState={mcpConfig.defaultState}
            publicApiKey={mcpConfig.publicApiKey}
          />
        )}
      </div>
    </AppShell>
  );
}
