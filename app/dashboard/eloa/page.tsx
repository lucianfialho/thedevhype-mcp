import { getSources, getArticles, getBookmarks, getAllTags } from './actions';
import { EloaDashboard } from './eloa-dashboard';

export const dynamic = 'force-dynamic';

const TABS = ['feed', 'fontes', 'bookmarks', 'busca'] as const;
type Tab = (typeof TABS)[number];

export default async function EloaPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'feed';

  const [sourcesData, articlesData, bookmarksData, tagsData] = await Promise.all([
    getSources(),
    getArticles(),
    getBookmarks(),
    getAllTags(),
  ]);

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center gap-4">
        <img
          src="/eloa.png"
          alt="Eloa"
          className="h-12 w-12 rounded-full"
        />
        <div>
          <h2 className="text-2xl font-bold">Eloa</h2>
          <p className="text-sm text-zinc-500">AI Content Curator</p>
        </div>
        <kbd className="ml-auto rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-400 dark:border-zinc-700">
          {'\u2318'}K
        </kbd>
      </div>

      <EloaDashboard
        initialTab={tab}
        initialSources={sourcesData}
        initialArticles={articlesData}
        initialBookmarks={bookmarksData}
        initialTags={tagsData}
      />
    </main>
  );
}
