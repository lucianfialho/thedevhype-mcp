'use client';

import { useState, useEffect } from 'react';
import { Command } from 'cmdk';
import { addSource, addBookmark, searchContent } from './actions';
import type { SourceWithSubscription, Bookmark } from '@/app/lib/mcp/servers/eloa.schema';

interface CommandBarProps {
  onNavigate: (tab: 'feed' | 'fontes' | 'bookmarks' | 'busca' | 'analytics') => void;
  onSourceAdded: (source: SourceWithSubscription) => void;
  onBookmarkAdded: (bookmark: Bookmark) => void;
}

export function CommandBar({ onNavigate, onSourceAdded, onBookmarkAdded }: CommandBarProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'commands' | 'add-source' | 'add-bookmark'>('commands');
  const [inputValue, setInputValue] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ tipo: string; title: string; url: string }>
  >([]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        setMode('commands');
        setInputValue('');
        setError('');
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (mode !== 'commands' || inputValue.length < 3) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      const results = await searchContent(inputValue);
      setSearchResults(results.slice(0, 5));
    }, 300);
    return () => clearTimeout(timeout);
  }, [inputValue, mode]);

  async function handleAddSource() {
    if (!inputValue) return;
    setLoading(true);
    setError('');
    const result = await addSource(inputValue);
    setLoading(false);
    if ('error' in result && result.error) {
      setError(result.error);
    } else if ('data' in result && result.data) {
      onSourceAdded(result.data);
      setOpen(false);
      setInputValue('');
    }
  }

  async function handleAddBookmark() {
    if (!inputValue) return;
    setLoading(true);
    setError('');
    const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    const result = await addBookmark(inputValue, undefined, tags);
    setLoading(false);
    if ('error' in result && typeof result.error === 'string') {
      setError(result.error);
    } else if ('data' in result && result.data) {
      onBookmarkAdded(result.data);
      setOpen(false);
      setInputValue('');
      setTagsInput('');
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div className="relative w-full max-w-lg">
        <Command
          className="rounded-xl border border-zinc-200 bg-white shadow-2xl dark:border-zinc-700 dark:bg-zinc-900"
          shouldFilter={mode === 'commands'}
        >
          {mode === 'commands' && (
            <>
              <Command.Input
                placeholder="Digite um comando ou busque..."
                value={inputValue}
                onValueChange={setInputValue}
                className="w-full border-b border-zinc-200 bg-transparent px-4 py-3 text-sm outline-none placeholder:text-zinc-400 dark:border-zinc-700"
              />
              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="px-4 py-6 text-center text-sm text-zinc-400">
                  Nenhum resultado.
                </Command.Empty>

                <Command.Group heading="Fontes" className="px-2 py-1 text-xs font-semibold text-zinc-400">
                  <Command.Item
                    onSelect={() => { setMode('add-source'); setInputValue(''); }}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm text-zinc-700 aria-selected:bg-zinc-100 dark:text-zinc-300 dark:aria-selected:bg-zinc-800"
                  >
                    + Adicionar fonte RSS
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Bookmarks" className="px-2 py-1 text-xs font-semibold text-zinc-400">
                  <Command.Item
                    onSelect={() => { setMode('add-bookmark'); setInputValue(''); }}
                    className="cursor-pointer rounded-md px-3 py-2 text-sm text-zinc-700 aria-selected:bg-zinc-100 dark:text-zinc-300 dark:aria-selected:bg-zinc-800"
                  >
                    + Salvar bookmark
                  </Command.Item>
                </Command.Group>

                <Command.Group heading="Navegar" className="px-2 py-1 text-xs font-semibold text-zinc-400">
                  {(['feed', 'fontes', 'bookmarks', 'busca', 'analytics'] as const).map((tab) => (
                    <Command.Item
                      key={tab}
                      onSelect={() => { onNavigate(tab); setOpen(false); }}
                      className="cursor-pointer rounded-md px-3 py-2 text-sm text-zinc-700 capitalize aria-selected:bg-zinc-100 dark:text-zinc-300 dark:aria-selected:bg-zinc-800"
                    >
                      Ir para {tab}
                    </Command.Item>
                  ))}
                </Command.Group>

                {searchResults.length > 0 && (
                  <Command.Group heading="Resultados" className="px-2 py-1 text-xs font-semibold text-zinc-400">
                    {searchResults.map((r, i) => (
                      <Command.Item
                        key={i}
                        onSelect={() => window.open(r.url, '_blank')}
                        className="cursor-pointer rounded-md px-3 py-2 text-sm aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                      >
                        <span className={`mr-2 rounded px-1.5 py-0.5 text-xs ${
                          r.tipo === 'artigo'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        }`}>
                          {r.tipo}
                        </span>
                        <span className="text-zinc-700 dark:text-zinc-300">{r.title}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}
              </Command.List>
            </>
          )}

          {mode === 'add-source' && (
            <div className="p-4">
              <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Adicionar fonte RSS</p>
              <input
                type="url"
                placeholder="https://example.com/feed.xml"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddSource()}
                autoFocus
                className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
              />
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAddSource}
                  disabled={loading || !inputValue}
                  className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {loading ? 'Validando...' : 'Adicionar'}
                </button>
                <button
                  onClick={() => { setMode('commands'); setInputValue(''); setError(''); }}
                  className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {mode === 'add-bookmark' && (
            <div className="p-4">
              <p className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">Salvar bookmark</p>
              <input
                type="url"
                placeholder="https://example.com/artigo"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
                className="mb-2 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
              />
              <input
                type="text"
                placeholder="Tags (separadas por virgula)"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddBookmark()}
                className="w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
              />
              {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={handleAddBookmark}
                  disabled={loading || !inputValue}
                  className="rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  onClick={() => { setMode('commands'); setInputValue(''); setTagsInput(''); setError(''); }}
                  className="rounded px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}
        </Command>
      </div>
    </div>
  );
}
