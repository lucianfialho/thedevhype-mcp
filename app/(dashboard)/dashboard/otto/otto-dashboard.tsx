'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell, TabSelect } from '../components/ui';
import { NotesTab } from './tabs/notes-tab';
import { LinksTab } from './tabs/links-tab';
import { HighlightsTab } from './tabs/highlights-tab';
import { PeopleTab } from './tabs/people-tab';
import { CompaniesTab } from './tabs/companies-tab';
import { GraphTab } from './tabs/graph-tab';
import { SearchTab } from './tabs/search-tab';
import { SettingsTab } from '../eloa/tabs/settings-tab';
import { ChefHat } from 'lucide-react';
import { RecipesTab, OTTO_RECIPES, CROSS_RECIPES } from '../components/recipes-tab';
import { UserUsageTab } from '../components/user-usage-tab';
import type { UserMcpUsageStats } from '../components/user-mcp-usage';
import type { Entry } from '@/app/lib/mcp/servers/otto.schema';

const TABS = [
  { id: 'notas', label: 'Notes' },
  { id: 'links', label: 'Links' },
  { id: 'destaques', label: 'Highlights' },
  { id: 'pessoas', label: 'People' },
  { id: 'empresas', label: 'Companies' },
  { id: 'graph', label: 'Graph' },
  { id: 'busca', label: 'Search' },
  { id: 'recipes', label: 'Recipes', icon: <ChefHat size={14} /> },
  { id: 'usage', label: 'Usage' },
  { id: 'config', label: 'Config' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface OttoDashboardProps {
  initialTab: Tab;
  initialNotes: Entry[];
  initialLinks: Entry[];
  initialHighlights: Entry[];
  initialPeople: Entry[];
  initialCompanies: Entry[];
  initialCounts: { total: number; notes: number; links: number; highlights: number; people: number; companies: number };
  initialTags: string[];
  initialGraphData: { nodes: Array<{ id: number; type: string; title: string }>; edges: Array<{ fromId: number; toId: number }> };
  initialUsageStats: UserMcpUsageStats;
  mcpConfig: {
    mcpUrl: string;
    tools: Array<{ name: string; description: string }>;
    enabled: boolean;
    hasApiKey: boolean;
    maskedApiKey: string | null;
  } | null;
}

export function OttoDashboard({
  initialTab,
  initialNotes,
  initialLinks,
  initialHighlights,
  initialPeople,
  initialCompanies,
  initialCounts,
  initialTags,
  initialGraphData,
  initialUsageStats,
  mcpConfig,
}: OttoDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [notes, setNotes] = useState(initialNotes);
  const [links, setLinks] = useState(initialLinks);
  const [highlights, setHighlights] = useState(initialHighlights);
  const [people, setPeople] = useState(initialPeople);
  const [companies, setCompanies] = useState(initialCompanies);
  const [counts] = useState(initialCounts);

  function switchTab(tab: string) {
    setActiveTab(tab as Tab);
    router.push(`/dashboard/otto?tab=${tab}`, { scroll: false });
  }

  return (
    <AppShell title="Otto">
      <div className="mb-4 shrink-0 flex items-center gap-3">
        <img src="/otto.png" alt="Otto" className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">Otto</h2>
          <p className="text-sm text-slate-500">Second Brain</p>
        </div>
        <TabSelect
          options={TABS}
          value={activeTab}
          onChange={switchTab}
          badge={{ id: 'notas', count: counts.total }}
        />
      </div>

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'notas' && (
          <NotesTab entries={notes} onEntriesChange={setNotes} />
        )}
        {activeTab === 'links' && (
          <LinksTab entries={links} onEntriesChange={setLinks} />
        )}
        {activeTab === 'destaques' && (
          <HighlightsTab entries={highlights} onEntriesChange={setHighlights} />
        )}
        {activeTab === 'pessoas' && (
          <PeopleTab entries={people} onEntriesChange={setPeople} />
        )}
        {activeTab === 'empresas' && (
          <CompaniesTab entries={companies} onEntriesChange={setCompanies} />
        )}
        {activeTab === 'graph' && (
          <GraphTab nodes={initialGraphData.nodes} edges={initialGraphData.edges} />
        )}
        {activeTab === 'busca' && <SearchTab />}
        {activeTab === 'recipes' && <RecipesTab recipes={[...OTTO_RECIPES, ...CROSS_RECIPES]} mcpName="Otto" />}
        {activeTab === 'usage' && <UserUsageTab stats={initialUsageStats} />}
        {activeTab === 'config' && mcpConfig && (
          <SettingsTab
            mcpName="otto"
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
