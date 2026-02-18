'use client';

import { useState, useEffect } from 'react';
import { searchEntries } from '../actions';

type Tipo = 'todos' | 'note' | 'link' | 'highlight' | 'person' | 'company';

interface SearchResult {
  id: number;
  type: string;
  title: string;
  url: string | null;
  source: string | null;
  excerpt: string | null;
  tags: string[] | null;
  createdAt: string;
  rank: number;
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

function highlightMatch(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200 px-0.5">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const TIPO_OPTIONS: { value: Tipo; label: string }[] = [
  { value: 'todos', label: 'All' },
  { value: 'note', label: 'Notes' },
  { value: 'link', label: 'Links' },
  { value: 'highlight', label: 'Highlights' },
  { value: 'person', label: 'People' },
  { value: 'company', label: 'Companies' },
];

const TYPE_STYLES: Record<string, string> = {
  note: 'bg-purple-100 text-purple-700',
  link: 'bg-blue-100 text-blue-700',
  highlight: 'bg-amber-100 text-amber-700',
  person: 'bg-rose-100 text-rose-700',
  company: 'bg-emerald-100 text-emerald-700',
};

export function SearchTab() {
  const [query, setQuery] = useState('');
  const [tipo, setTipo] = useState<Tipo>('todos');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(async () => {
      const data = await searchEntries(query, tipo === 'todos' ? undefined : tipo);
      setResults(data as SearchResult[]);
      setSearched(true);
      setLoading(false);
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, tipo]);

  return (
    <div>
      <div className="mb-4">
        <div className="relative">
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
          >
            <circle cx="8" cy="8" r="5.5" />
            <path d="M12 12l4 4" />
          </svg>
          <input
            type="text"
            placeholder="Search notes, links, and highlights..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full rounded-xl border-0 bg-slate-100 py-3 pl-10 pr-4 text-base text-slate-800 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>

      <div className="mb-4 flex gap-1">
        {TIPO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTipo(opt.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              tipo === opt.value
                ? 'bg-slate-800 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-2xl border border-slate-200 p-4">
              <div className="mb-2 h-4 w-3/4 rounded bg-slate-100" />
              <div className="h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      )}

      {!loading && !searched && query.length < 2 && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-base text-slate-400">Type to search.</p>
          <p className="mt-1 text-sm text-slate-500">
            Search titles, excerpts, and tags across all entries.
          </p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-base text-slate-400">No results for &quot;{query}&quot;.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-3">
          {results.map((r) => (
            <div
              key={r.id}
              className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-sm font-medium ${TYPE_STYLES[r.type] || 'bg-slate-100 text-slate-700'}`}
                >
                  {r.type}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-base font-medium text-slate-800">
                    {highlightMatch(r.title, query)}
                  </h4>
                  {r.excerpt && (
                    <p className="mt-1 text-sm text-slate-400">
                      {highlightMatch(r.excerpt, query)}
                    </p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-slate-500">{timeAgo(r.createdAt)}</span>
                    {r.url && (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate text-sm text-blue-500 hover:underline"
                      >
                        {r.url}
                      </a>
                    )}
                    {r.source && (
                      <span className="text-sm text-slate-400">from: {r.source}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
