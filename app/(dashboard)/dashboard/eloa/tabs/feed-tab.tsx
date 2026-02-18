'use client';

import { useState, useEffect } from 'react';
import { CheckCheck, RefreshCw, ChevronDown, ExternalLink } from 'lucide-react';
import { getArticles, refreshFeeds, markArticleRead, markAllRead, getArticleClickCounts } from '../actions';
import { MiniSelect } from '../../components/ui';
import type { SourceWithSubscription } from '@/app/lib/mcp/servers/eloa.schema';

interface FeedArticle {
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
}

interface FeedTabProps {
  articles: FeedArticle[];
  sources: SourceWithSubscription[];
  onArticlesChange: (articles: FeedArticle[]) => void;
  onUnreadCountChange: (count: number) => void;
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

export function FeedTab({ articles, sources, onArticlesChange, onUnreadCountChange }: FeedTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [selectedSource, setSelectedSource] = useState<number | undefined>();
  const [readFilter, setReadFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(articles.length >= 20);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [clickCounts, setClickCounts] = useState<Record<number, number>>({});

  useEffect(() => {
    const ids = articles.map((a) => a.id);
    if (ids.length === 0) return;
    getArticleClickCounts(ids).then(setClickCounts);
  }, [articles]);

  const sourceMap = new Map(sources.map((s) => [s.id, s.title]));
  const unreadCount = articles.filter((a) => !a.isRead).length;

  async function handleRefresh() {
    setRefreshing(true);
    await refreshFeeds(selectedSource);
    const fresh = await getArticles(selectedSource, 0, 20, readFilter);
    onArticlesChange(fresh);
    setPage(0);
    setHasMore(fresh.length >= 20);
    onUnreadCountChange(fresh.filter((a) => !a.isRead).length);
    setRefreshing(false);
  }

  async function handleFilterChange(sourceId: number | undefined) {
    setSelectedSource(sourceId);
    setPage(0);
    setExpandedId(null);
    const fresh = await getArticles(sourceId, 0, 20, readFilter);
    onArticlesChange(fresh);
    setHasMore(fresh.length >= 20);
  }

  async function handleReadFilterChange(filter: 'all' | 'unread' | 'read') {
    setReadFilter(filter);
    setPage(0);
    setExpandedId(null);
    const fresh = await getArticles(selectedSource, 0, 20, filter);
    onArticlesChange(fresh);
    setHasMore(fresh.length >= 20);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    const more = await getArticles(selectedSource, nextPage, 20, readFilter);
    onArticlesChange([...articles, ...more]);
    setPage(nextPage);
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  }

  async function handleExpand(article: FeedArticle) {
    const isExpanding = expandedId !== article.id;
    setExpandedId(isExpanding ? article.id : null);

    if (isExpanding && !article.isRead) {
      // Optimistic update
      const updated = articles.map((a) =>
        a.id === article.id ? { ...a, isRead: true, readAt: new Date().toISOString() } : a,
      );
      onArticlesChange(updated);
      onUnreadCountChange(updated.filter((a) => !a.isRead).length);
      // Background persist
      markArticleRead(article.id, true);
    }
  }

  async function handleMarkAllRead() {
    setMarkingAllRead(true);
    await markAllRead(selectedSource);
    const updated = articles.map((a) => ({ ...a, isRead: true, readAt: a.readAt || new Date().toISOString() }));
    onArticlesChange(updated);
    onUnreadCountChange(0);
    setMarkingAllRead(false);
  }

  return (
    <>
      <div className="mb-3 shrink-0 flex flex-wrap items-center gap-2">
        <MiniSelect
          value={selectedSource ?? ''}
          options={[
            { value: '' as string | number, label: 'All sources' },
            ...sources.map((s) => ({ value: s.id as string | number, label: s.title })),
          ]}
          onChange={(v) => handleFilterChange(v ? Number(v) : undefined)}
          maxW="max-w-[10rem]"
        />
        <MiniSelect
          value={readFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'unread', label: 'Unread' },
            { value: 'read', label: 'Read' },
          ]}
          onChange={(v) => handleReadFilterChange(v as 'all' | 'unread' | 'read')}
        />
        <div className="ml-auto flex gap-1.5">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAllRead}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 disabled:opacity-50"
              title="Mark all read"
            >
              {markingAllRead ? (
                <span className="text-xs">...</span>
              ) : (
                <CheckCheck size={16} />
              )}
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50"
            title="Refresh feeds"
          >
            {refreshing ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
          </button>
        </div>
      </div>

      <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto pt-2">
      {articles.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-base text-slate-400">No articles in feed.</p>
          <p className="mt-1 text-sm text-slate-500">
            Add sources and click &quot;Refresh feeds&quot;.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {articles.map((article) => (
            <div
              key={article.id}
              className="rounded-2xl border border-slate-200 transition-colors hover:border-slate-300"
            >
              <button
                onClick={() => handleExpand(article)}
                className="w-full px-4 py-3 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    {!article.isRead && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    )}
                    <div className="min-w-0 flex-1">
                      <h4
                        className={`text-base ${
                          article.isRead
                            ? 'font-normal text-slate-400'
                            : 'font-semibold text-slate-800'
                        }`}
                      >
                        {article.title}
                      </h4>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                        <span className="rounded bg-slate-100 px-1.5 py-0.5">
                          {sourceMap.get(article.sourceId) || 'Source'}
                        </span>
                        {article.author && <span>{article.author}</span>}
                        {article.publishedAt && <span>{timeAgo(article.publishedAt)}</span>}
                      </div>
                    </div>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`mt-1 shrink-0 text-slate-500 transition-transform ${
                      expandedId === article.id ? 'rotate-180' : ''
                    }`}
                  />
                </div>
                {expandedId !== article.id && article.content && (
                  <p className="mt-1 truncate text-sm text-slate-500">
                    {article.content.slice(0, 150)}
                  </p>
                )}
              </button>

              {expandedId === article.id && (
                <div className="border-t border-slate-200 px-4 py-3">
                  {article.content && (
                    <p className="mb-3 whitespace-pre-line text-base text-slate-500">
                      {article.content}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    <a
                      href={article.shortCode ? `/r/${article.shortCode}` : article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium text-slate-400 hover:text-slate-700"
                    >
                      Open article
                      <ExternalLink size={12} />
                    </a>
                    {clickCounts[article.id] > 0 && (
                      <span className="text-sm text-slate-500">
                        {clickCounts[article.id]} {clickCounts[article.id] === 1 ? 'click' : 'clicks'}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full rounded-2xl bg-slate-100 py-2.5 text-base text-slate-500 hover:bg-slate-200 disabled:opacity-50"
            >
              {loadingMore ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}
      </div>
    </>
  );
}
