'use client';

import { useState } from 'react';
import { getArticles, refreshFeeds } from '../actions';
import type { Source } from '@/app/lib/mcp/servers/eloa.schema';

interface FeedArticle {
  id: number;
  title: string;
  url: string;
  author: string | null;
  content: string | null;
  publishedAt: string | null;
  createdAt: string;
  sourceId: number;
}

interface FeedTabProps {
  articles: FeedArticle[];
  sources: Source[];
  onArticlesChange: (articles: FeedArticle[]) => void;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function FeedTab({ articles, sources, onArticlesChange }: FeedTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<number | undefined>();
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(articles.length >= 20);

  const sourceMap = new Map(sources.map((s) => [s.id, s.title]));

  async function handleRefresh() {
    setRefreshing(true);
    await refreshFeeds(selectedSource);
    const fresh = await getArticles(selectedSource, 0, 20);
    onArticlesChange(fresh);
    setPage(0);
    setHasMore(fresh.length >= 20);
    setRefreshing(false);
  }

  async function handleFilterChange(sourceId: number | undefined) {
    setSelectedSource(sourceId);
    setPage(0);
    setExpandedId(null);
    const fresh = await getArticles(sourceId, 0, 20);
    onArticlesChange(fresh);
    setHasMore(fresh.length >= 20);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    const more = await getArticles(selectedSource, nextPage, 20);
    onArticlesChange([...articles, ...more]);
    setPage(nextPage);
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <select
          value={selectedSource ?? ''}
          onChange={(e) => handleFilterChange(e.target.value ? Number(e.target.value) : undefined)}
          className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none sm:w-auto dark:border-zinc-700"
        >
          <option value="">Todas as fontes</option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 sm:w-auto dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
        >
          {refreshing ? 'Atualizando...' : 'Atualizar feeds'}
        </button>
      </div>

      {articles.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">Nenhum artigo no feed.</p>
          <p className="mt-1 text-xs text-zinc-400">
            Adicione fontes e clique em &quot;Atualizar feeds&quot;.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <div
              key={article.id}
              className="rounded-lg border border-zinc-200 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            >
              <button
                onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                className="w-full px-4 py-3 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {article.title}
                    </h4>
                    <div className="mt-1 flex items-center gap-2 text-xs text-zinc-400">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-800">
                        {sourceMap.get(article.sourceId) || 'Fonte'}
                      </span>
                      {article.author && <span>{article.author}</span>}
                      {article.publishedAt && <span>{timeAgo(article.publishedAt)}</span>}
                    </div>
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={`mt-1 shrink-0 text-zinc-400 transition-transform ${
                      expandedId === article.id ? 'rotate-180' : ''
                    }`}
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </div>
                {expandedId !== article.id && article.content && (
                  <p className="mt-1 truncate text-xs text-zinc-400">
                    {article.content.slice(0, 150)}
                  </p>
                )}
              </button>

              {expandedId === article.id && (
                <div className="border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
                  {article.content && (
                    <p className="mb-3 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-400">
                      {article.content}
                    </p>
                  )}
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  >
                    Abrir artigo
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M5 2h5v5M10 2L4 8" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full rounded-md border border-zinc-200 py-2 text-sm text-zinc-500 hover:border-zinc-300 hover:text-zinc-700 disabled:opacity-50 dark:border-zinc-700 dark:hover:border-zinc-600 dark:hover:text-zinc-300"
            >
              {loadingMore ? 'Carregando...' : 'Carregar mais'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
