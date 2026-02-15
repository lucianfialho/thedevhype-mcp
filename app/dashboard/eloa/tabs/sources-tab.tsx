'use client';

import { useState } from 'react';
import { addSource, removeSource } from '../actions';
import type { Source } from '@/app/lib/mcp/servers/eloa.schema';

const MAX_SOURCES = 20;

interface SourcesTabProps {
  sources: Source[];
  onSourcesChange: (sources: Source[]) => void;
}

function timeAgo(dateStr: string | null) {
  if (!dateStr) return 'Nunca';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min atras`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h atras`;
  const days = Math.floor(hours / 24);
  return `${days}d atras`;
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
    if (!confirm('Remover esta fonte e todos os artigos associados?')) return;
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
        <h3 className="text-lg font-semibold">Fontes RSS</h3>
        <span className="text-sm text-zinc-400">
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
          className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 sm:flex-1 dark:border-zinc-700 dark:focus:border-zinc-500"
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none sm:flex-none dark:border-zinc-700"
          >
            <option value="">Categoria</option>
            <option value="tech">Tech</option>
            <option value="design">Design</option>
            <option value="news">News</option>
            <option value="other">Other</option>
          </select>
          <button
            type="submit"
            disabled={loading || !url || sources.length >= MAX_SOURCES}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? 'Validando...' : 'Adicionar'}
          </button>
        </div>
      </form>

      {error && (
        <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 dark:border-red-800 dark:bg-red-950 dark:text-red-400">
          {error}
        </p>
      )}

      {sources.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">Nenhuma fonte adicionada.</p>
          <p className="mt-1 text-xs text-zinc-400">
            Adicione uma URL de feed RSS acima ou use{' '}
            <kbd className="rounded border border-zinc-200 px-1 py-0.5 text-xs dark:border-zinc-700">
              {'\u2318'}K
            </kbd>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map((source) => (
            <div
              key={source.id}
              className="group flex items-start justify-between rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {source.title}
                  </h4>
                  {source.category && (
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {source.category}
                    </span>
                  )}
                </div>
                <p className="mt-1 truncate text-xs text-zinc-400">
                  <code>{source.url}</code>
                </p>
                <p className="mt-1 text-xs text-zinc-400">
                  Atualizado: {timeAgo(source.lastFetchedAt)}
                </p>
              </div>
              <button
                onClick={() => handleRemove(source.id)}
                disabled={removingId === source.id}
                className="ml-3 shrink-0 rounded p-1 text-zinc-400 opacity-100 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
                title="Remover fonte"
              >
                {removingId === source.id ? (
                  <span className="text-xs">...</span>
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
