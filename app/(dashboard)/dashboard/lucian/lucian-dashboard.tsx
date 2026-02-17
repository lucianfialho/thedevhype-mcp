'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsTab } from '../eloa/tabs/settings-tab';
import { NotasTab } from './tabs/notas-tab';
import { ProdutosTab } from './tabs/produtos-tab';
import { PrecosTab } from './tabs/precos-tab';
import { GastosTab } from './tabs/gastos-tab';
import { ListaTab } from './tabs/lista-tab';

const TABS = [
  { id: 'notas', label: 'Notas' },
  { id: 'produtos', label: 'Produtos' },
  { id: 'precos', label: 'Precos' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'lista', label: 'Lista' },
  { id: 'config', label: 'Configuracoes' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface LucianDashboardProps {
  initialTab: Tab;
  initialNotas: Array<{
    id: number;
    storeName: string;
    cnpj: string;
    totalItens: number;
    valorAPagar: number;
    createdAt: string;
  }>;
  notasSummary: {
    totalNotas: number;
    totalValor: number;
    totalLojas: number;
  };
  initialProdutos: Array<{
    id: number;
    codigo: string;
    nome: string;
    unidade: string | null;
    categoria: string | null;
    storeId: number;
    storeName: string;
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
}

export function LucianDashboard({
  initialTab,
  initialNotas,
  notasSummary,
  initialProdutos,
  produtosSummary,
  initialGastos,
  gastosSummary,
  initialListItems,
  listSummary,
  mcpConfig,
}: LucianDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    router.push(`/dashboard/lucian?tab=${tab}`, { scroll: false });
  }

  return (
    <>
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
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

      {activeTab === 'notas' && (
        <NotasTab initialNotas={initialNotas} summary={notasSummary} />
      )}
      {activeTab === 'produtos' && (
        <ProdutosTab initialProdutos={initialProdutos} summary={produtosSummary} />
      )}
      {activeTab === 'precos' && <PrecosTab />}
      {activeTab === 'gastos' && (
        <GastosTab initialGastos={initialGastos} initialSummary={gastosSummary} />
      )}
      {activeTab === 'lista' && (
        <ListaTab initialItems={initialListItems} initialSummary={listSummary} />
      )}
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
    </>
  );
}
