'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommandBar } from './command-bar';
import { SourcesTab } from './tabs/sources-tab';
import { FeedTab } from './tabs/feed-tab';
import { BookmarksTab } from './tabs/bookmarks-tab';
import { SearchTab } from './tabs/search-tab';
import { AnalyticsTab } from './tabs/analytics-tab';
import { SettingsTab } from './tabs/settings-tab';
import type { SourceWithSubscription, Bookmark } from '@/app/lib/mcp/servers/eloa.schema';

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'fontes', label: 'Fontes' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'busca', label: 'Busca' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'config', label: 'Configuracoes' },
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
  isAdmin: boolean;
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
  isAdmin,
  mcpConfig,
}: EloaDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [sourcesData, setSourcesData] = useState(initialSources);
  const [articlesData, setArticlesData] = useState(initialArticles);
  const [bookmarksData, setBookmarksData] = useState(initialBookmarks);
  const [tagsData, setTagsData] = useState(initialTags);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);

  function switchTab(tab: Tab) {
    setActiveTab(tab);
    router.push(`/dashboard/eloa?tab=${tab}`, { scroll: false });
  }

  return (
    <>
      <CommandBar
        onNavigate={switchTab}
        onSourceAdded={(s) => setSourcesData((prev) => [s, ...prev])}
        onBookmarkAdded={(b) => setBookmarksData((prev) => [b, ...prev])}
      />

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
            {tab.id === 'feed' && unreadCount > 0 && (
              <span className="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'fontes' && (
        <SourcesTab
          sources={sourcesData}
          onSourcesChange={setSourcesData}
        />
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
      {activeTab === 'analytics' && <AnalyticsTab isAdmin={isAdmin} />}
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
    </>
  );
}
