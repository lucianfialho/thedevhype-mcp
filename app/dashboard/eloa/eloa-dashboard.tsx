'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommandBar } from './command-bar';
import { SourcesTab } from './tabs/sources-tab';
import { FeedTab } from './tabs/feed-tab';
import { BookmarksTab } from './tabs/bookmarks-tab';
import { SearchTab } from './tabs/search-tab';
import type { Source, Article, Bookmark } from '@/app/lib/mcp/servers/eloa.schema';

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'fontes', label: 'Fontes' },
  { id: 'bookmarks', label: 'Bookmarks' },
  { id: 'busca', label: 'Busca' },
] as const;

type Tab = (typeof TABS)[number]['id'];

interface EloaDashboardProps {
  initialTab: Tab;
  initialSources: Source[];
  initialArticles: Array<{
    id: number;
    title: string;
    url: string;
    author: string | null;
    content: string | null;
    publishedAt: string | null;
    createdAt: string;
    sourceId: number;
  }>;
  initialBookmarks: Bookmark[];
  initialTags: string[];
}

export function EloaDashboard({
  initialTab,
  initialSources,
  initialArticles,
  initialBookmarks,
  initialTags,
}: EloaDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [sourcesData, setSourcesData] = useState(initialSources);
  const [articlesData, setArticlesData] = useState(initialArticles);
  const [bookmarksData, setBookmarksData] = useState(initialBookmarks);
  const [tagsData, setTagsData] = useState(initialTags);

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

      <div className="mb-6 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {tab.label}
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
    </>
  );
}
