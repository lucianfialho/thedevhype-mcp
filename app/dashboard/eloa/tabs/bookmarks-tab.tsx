'use client';

import { useState } from 'react';
import { addBookmark, removeBookmark, getBookmarks } from '../actions';
import type { Bookmark } from '@/app/lib/mcp/servers/eloa.schema';

interface BookmarksTabProps {
  bookmarks: Bookmark[];
  allTags: string[];
  onBookmarksChange: (bookmarks: Bookmark[]) => void;
  onTagsChange: (tags: string[]) => void;
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

export function BookmarksTab({ bookmarks, allTags, onBookmarksChange, onTagsChange }: BookmarksTabProps) {
  const [url, setUrl] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(bookmarks.length >= 20);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setError('');
    const tags = tagsInput ? tagsInput.split(',').map((t) => t.trim()).filter(Boolean) : undefined;
    const result = await addBookmark(url, undefined, tags, notes || undefined);
    setLoading(false);
    if ('error' in result && typeof result.error === 'string') {
      setError(result.error);
    } else if ('data' in result && result.data) {
      onBookmarksChange([result.data, ...bookmarks]);
      if (tags) {
        const newTags = new Set([...allTags, ...tags]);
        onTagsChange([...newTags].sort());
      }
      setUrl('');
      setTagsInput('');
      setNotes('');
      setShowForm(false);
    }
  }

  async function handleRemove(id: number) {
    if (!confirm('Remover este bookmark?')) return;
    setRemovingId(id);
    const result = await removeBookmark(id);
    setRemovingId(null);
    if (!('error' in result)) {
      onBookmarksChange(bookmarks.filter((b) => b.id !== id));
    }
  }

  async function handleTagFilter(tag: string | undefined) {
    setSelectedTag(tag);
    setPage(0);
    const fresh = await getBookmarks(tag, 0, 20);
    onBookmarksChange(fresh);
    setHasMore(fresh.length >= 20);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    const nextPage = page + 1;
    const more = await getBookmarks(selectedTag, nextPage, 20);
    onBookmarksChange([...bookmarks, ...more]);
    setPage(nextPage);
    setHasMore(more.length >= 20);
    setLoadingMore(false);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold">Bookmarks</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {showForm ? 'Cancelar' : '+ Salvar bookmark'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <input
            type="url"
            placeholder="https://example.com/artigo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            autoFocus
            className="mb-2 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
          />
          <input
            type="text"
            placeholder="Tags (separadas por virgula)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="mb-2 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
          />
          <textarea
            placeholder="Notas (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mb-3 w-full resize-none rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm outline-none focus:border-zinc-400 dark:border-zinc-700 dark:focus:border-zinc-500"
          />
          {error && <p className="mb-2 text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !url}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </form>
      )}

      {allTags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            onClick={() => handleTagFilter(undefined)}
            className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
              !selectedTag
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
            }`}
          >
            Todos
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => handleTagFilter(selectedTag === tag ? undefined : tag)}
              className={`rounded-full px-2.5 py-1 text-xs transition-colors ${
                selectedTag === tag
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {bookmarks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 py-12 text-center dark:border-zinc-700">
          <p className="text-sm text-zinc-500">
            {selectedTag ? `Nenhum bookmark com a tag "${selectedTag}".` : 'Nenhum bookmark salvo.'}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Salve URLs interessantes com{' '}
            <kbd className="rounded border border-zinc-200 px-1 py-0.5 text-xs dark:border-zinc-700">
              {'\u2318'}K
            </kbd>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="group rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                  >
                    {bookmark.title}
                  </a>
                  <p className="mt-0.5 truncate text-xs text-zinc-400">
                    {bookmark.url}
                  </p>
                  {bookmark.tags && bookmark.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {bookmark.tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => handleTagFilter(tag)}
                          className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700"
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  {bookmark.notes && (
                    <p className="mt-2 text-xs text-zinc-500">{bookmark.notes}</p>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">{timeAgo(bookmark.createdAt)}</p>
                </div>
                <button
                  onClick={() => handleRemove(bookmark.id)}
                  disabled={removingId === bookmark.id}
                  className="ml-2 shrink-0 rounded p-1 text-zinc-400 opacity-100 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100 disabled:opacity-50"
                  title="Remover bookmark"
                >
                  {removingId === bookmark.id ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  )}
                </button>
              </div>
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
