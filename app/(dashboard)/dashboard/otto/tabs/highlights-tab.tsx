'use client';

import { useState } from 'react';
import { getEntries } from '../actions';
import type { Entry } from '@/app/lib/mcp/servers/otto.schema';

interface HighlightsTabProps {
  entries: Entry[];
  onEntriesChange: (entries: Entry[]) => void;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function HighlightsTab({ entries, onEntriesChange }: HighlightsTabProps) {
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(entries.length >= 20);

  async function handleLoadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    const more = await getEntries('highlight', undefined, nextPage, 20);
    onEntriesChange([...entries, ...more]);
    setPage(nextPage);
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <p className="text-base text-slate-400">No highlights yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">salvar_destaque</code> via MCP to save your first highlight.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Highlights</h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
          >
            <div className="border-l-2 border-slate-300 pl-3">
              <p className="text-base italic text-slate-700 line-clamp-3">
                {entry.excerpt || entry.title}
              </p>
            </div>
            {entry.source && (
              <p className="mt-2 text-sm text-slate-500">
                Source: {entry.source}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-slate-400">{timeAgo(entry.updatedAt)}</span>
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
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
    </div>
  );
}
