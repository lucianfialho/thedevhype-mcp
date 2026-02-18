'use client';

import { useState } from 'react';
import { getEntries } from '../actions';
import type { Entry } from '@/app/lib/mcp/servers/otto.schema';

interface LinksTabProps {
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

function displayDomain(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function LinksTab({ entries, onEntriesChange }: LinksTabProps) {
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(entries.length >= 20);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  async function handleLoadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    const more = await getEntries('link', undefined, nextPage, 20);
    onEntriesChange([...entries, ...more]);
    setPage(nextPage);
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  }

  async function handleCopyUrl(id: number, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (entries.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <p className="text-base text-slate-400">No links saved yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">salvar_link</code> via MCP to save your first link.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Links</h3>
      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
          >
            <div className="flex items-baseline gap-2">
              <a
                href={entry.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 truncate text-base font-medium text-slate-800 hover:underline"
              >
                {entry.title}
              </a>
              <span className="shrink-0 text-sm text-slate-500">{timeAgo(entry.updatedAt)}</span>
            </div>
            {entry.url && (
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {displayDomain(entry.url)}
              </p>
            )}
            {entry.excerpt && entry.excerpt !== entry.url && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-400">{entry.excerpt}</p>
            )}
            {entry.tags && entry.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
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
            <div className="mt-1.5">
              <button
                onClick={() => entry.url && handleCopyUrl(entry.id, entry.url)}
                className="rounded-lg px-1.5 py-0.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-600"
              >
                {copiedId === entry.id ? 'Copied!' : 'Copy URL'}
              </button>
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
