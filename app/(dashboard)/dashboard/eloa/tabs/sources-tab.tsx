'use client';

import { useState } from 'react';
import { addSource, removeSource } from '../actions';
import type { SourceWithSubscription } from '@/app/lib/mcp/servers/eloa.schema';

const MAX_SOURCES = 20;

interface SourcesTabProps {
  sources: SourceWithSubscription[];
  onSourcesChange: (sources: SourceWithSubscription[]) => void;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function SourcesTab({ sources, onSourcesChange }: SourcesTabProps) {
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState<number | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError('');
    const result = await addSource(url, category || undefined);
    setLoading(false);
    if ('error' in result && result.error) {
      setError(result.error);
    } else if ('data' in result && result.data) {
      onSourcesChange([result.data, ...sources]);
      setUrl('');
      setCategory('');
    }
  }

  async function handleRemove(id: number) {
    if (!confirm('Unsubscribe from this source?')) return;
    setRemovingId(id);
    const result = await removeSource(id);
    setRemovingId(null);
    if (!('error' in result)) {
      onSourcesChange(sources.filter((s) => s.id !== id));
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">RSS Sources</h3>
        <span className="text-base text-slate-500">
          {sources.length}/{MAX_SOURCES}
        </span>
      </div>

      <form onSubmit={handleAdd} className="mb-6 space-y-2 sm:flex sm:gap-2 sm:space-y-0">
        <input
          type="url"
          placeholder="https://example.com/feed.xml"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
          className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400 sm:flex-1"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 outline-none hover:bg-slate-50 sm:flex-none"
          >
            <option value="">Category</option>
            <option value="tech">Tech</option>
            <option value="design">Design</option>
            <option value="news">News</option>
            <option value="other">Other</option>
          </select>
          <button
            type="submit"
            disabled={loading || !url || sources.length >= MAX_SOURCES}
            className="rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Validating...' : 'Add'}
          </button>
        </div>
      </form>

      {error && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-base text-red-600">
          {error}
        </p>
      )}

      {sources.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-base text-slate-400">No sources added.</p>
          <p className="mt-1 text-sm text-slate-500">
            Add an RSS feed URL above or use{' '}
            <kbd className="rounded border border-slate-200 px-1 py-0.5 text-sm">
              {'\u2318'}K
            </kbd>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="group flex items-start justify-between rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-base font-medium text-slate-800">
                    {source.title}
                  </h4>
                  {source.category && (
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-500">
                      {source.category}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-sm text-slate-500">
                  <code>{source.url}</code>
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                  <span>Updated: {timeAgo(source.lastFetchedAt)}</span>
                  {source.subscriberCount > 1 && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-sm">
                      {source.subscriberCount} subscribers
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => handleRemove(source.id)}
                disabled={removingId === source.id}
                className="ml-3 shrink-0 rounded p-1 text-slate-500 opacity-100 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
                title="Remove source"
              >
                {removingId === source.id ? (
                  <span className="text-sm">...</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M4 4l8 8M12 4l-8 8" />
                  </svg>
                )}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
