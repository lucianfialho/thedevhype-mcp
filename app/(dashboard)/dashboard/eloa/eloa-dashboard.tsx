'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell, TabSelect } from '../components/ui';
import { SourcesTab } from './tabs/sources-tab';
import { FeedTab } from './tabs/feed-tab';
import { BookmarksTab } from './tabs/bookmarks-tab';
import { SearchTab } from './tabs/search-tab';
import { SettingsTab } from './tabs/settings-tab';
import { ChefHat } from 'lucide-react';
import { RecipesTab, ELOA_RECIPES, CROSS_RECIPES } from '../components/recipes-tab';
import { UserUsageTab } from '../components/user-usage-tab';
import type { UserMcpUsageStats } from '../components/user-mcp-usage';
import type { SourceWithSubscription, Bookmark } from '@/app/lib/mcp/servers/eloa.schema';

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'fontes', label: 'Sources' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'busca', label: 'Search' },
  { id: 'recipes', label: 'Recipes', icon: <ChefHat size={14} /> },
  { id: 'usage', label: 'Usage' },
  { id: 'config', label: 'Config' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface EloaDashboardProps {
  initialTab: Tab;
  initialSources: SourceWithSubscription[];
  initialArticles: Array<{
    id: number;
    title: string;
    url: string;
    shortCode: string | null;
    author: string | null;
    content: string | null;
    publishedAt: string | null;
    createdAt: string;
    sourceId: number;
    isRead: boolean;
    readAt: string | null;
  }>;
  initialBookmarks: Bookmark[];
  initialTags: string[];
  initialUnreadCount: number;
  initialUsageStats: UserMcpUsageStats;
  mcpConfig: {
    mcpUrl: string;
    tools: Array<{ name: string; description: string }>;
    enabled: boolean;
    hasApiKey: boolean;
    maskedApiKey: string | null;
  } | null;
}

export function EloaDashboard({
  initialTab,
  initialSources,
  initialArticles,
  initialBookmarks,
  initialTags,
  initialUnreadCount,
  initialUsageStats,
  mcpConfig,
}: EloaDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [sourcesData, setSourcesData] = useState(initialSources);
  const [articlesData, setArticlesData] = useState(initialArticles);
  const [bookmarksData, setBookmarksData] = useState(initialBookmarks);
  const [tagsData, setTagsData] = useState(initialTags);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  function switchTab(tab: string) {
    setActiveTab(tab as Tab);
    router.push(`/dashboard/eloa?tab=${tab}`, { scroll: false });
  }

  return (
    <AppShell title="Eloa">
      <div className="mb-4 shrink-0 flex items-center gap-3">
        <img src="/eloa.png" alt="Eloa" className="h-10 w-10 rounded-full" />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">Eloa</h2>
          <p className="text-sm text-slate-500">AI Content Curator</p>
        </div>
        <TabSelect
          options={TABS}
          value={activeTab}
          onChange={switchTab}
          badge={{ id: 'feed', count: unreadCount }}
        />
      </div>

      {activeTab !== 'recipes' && (
        <button
          onClick={() => switchTab('recipes')}
          className="cursor-pointer mb-4 flex w-full items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left transition-colors hover:bg-amber-100"
        >
          <span className="text-lg">🍳</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-amber-800">Ready-made recipes available</p>
            <p className="text-xs text-amber-600">Pre-configured automations powered by Poke. Click to explore.</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-amber-400">
            <path d="M6 4l4 4-4 4" />
          </svg>
        </button>
      )}

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {activeTab === 'fontes' && (
          <SourcesTab sources={sourcesData} onSourcesChange={setSourcesData} />
        )}
        {activeTab === 'feed' && (
          <FeedTab
            articles={articlesData}
            sources={sourcesData}
            onArticlesChange={setArticlesData}
            onUnreadCountChange={setUnreadCount}
          />
        )}
        {activeTab === 'bookmarks' && (
          <BookmarksTab
            bookmarks={bookmarksData}
            allTags={tagsData}
            onBookmarksChange={setBookmarksData}
            onTagsChange={setTagsData}
          />
        )}
        {activeTab === 'busca' && <SearchTab />}
        {activeTab === 'recipes' && <RecipesTab recipes={[...ELOA_RECIPES, ...CROSS_RECIPES]} mcpName="Eloa" />}
        {activeTab === 'usage' && <UserUsageTab stats={initialUsageStats} />}
        {activeTab === 'config' && mcpConfig && (
          <SettingsTab
            mcpName="eloa"
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
