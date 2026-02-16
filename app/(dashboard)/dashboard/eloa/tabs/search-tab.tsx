'use client';

import { useState, useEffect } from 'react';
import { searchContent } from '../actions';

type Tipo = 'todos' | 'artigos' | 'bookmarks';

interface SearchResult {
  tipo: string;
  id: number;
  title: string;
  url: string;
  snippet: string;
  createdAt: string | null;
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

function highlightMatch(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-yellow-200 px-0.5 dark:bg-yellow-800">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

const TIPO_OPTIONS: { value: Tipo; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'artigos', label: 'Artigos' },
  { value: 'bookmarks', label: 'Bookmarks' },
];

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
      const data = await searchContent(query, tipo);
      setResults(data);
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
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          >
            <circle cx="8" cy="8" r="5.5" />
            <path d="M12 12l4 4" />
          </svg>
          <input
            type="text"
            placeholder="Buscar em artigos e bookmarks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="w-full rounded-lg border border-zinc-200 bg-transparent py-3 pl-10 pr-4 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
          />
        </div>
      </div>

      <div className="mb-4 flex gap-1">
        {TIPO_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setTipo(opt.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tipo === opt.value
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <div className="mb-2 h-4 w-3/4 rounded bg-zinc-200 dark:bg-zinc-700" />
              <div className="h-3 w-1/2 rounded bg-zinc-100 dark:bg-zinc-800" />
            </div>
          ))}
        </div>
      )}

      {!loading && !searched && query.length < 2 && (
        <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">Digite para buscar.</p>
          <p className="mt-1 text-xs text-zinc-400">
            Busca em titulos, conteudo, notas e tags.
          </p>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">Nenhum resultado para &quot;{query}&quot;.</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <div className="space-y-2">
          {results.map((r) => (
            <a
              key={`${r.tipo}-${r.id}`}
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            >
              <div className="flex items-start gap-2">
                <span
                  className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-xs font-medium ${
                    r.tipo === 'artigo'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                      : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  }`}
                >
                  {r.tipo}
                </span>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {highlightMatch(r.title, query)}
                  </h4>
                  <p className="mt-1 text-xs text-zinc-500">
                    {highlightMatch(r.snippet, query)}
                  </p>
                  {r.createdAt && (
                    <p className="mt-1 text-xs text-zinc-400">{timeAgo(r.createdAt)}</p>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
