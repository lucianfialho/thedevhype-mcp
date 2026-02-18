'use client';

import { useState } from 'react';
import { addBookmark, removeBookmark, getBookmarks } from '../actions';
import type { Bookmark } from '@/app/lib/mcp/servers/eloa.schema';
import { TabSelect } from '../../components/ui';

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
  const [copiedId, setCopiedId] = useState<number | null>(null);

  function displayTitle(bookmark: Bookmark) {
    if (bookmark.title && bookmark.title !== bookmark.url) return bookmark.title;
    try {
      const u = new URL(bookmark.url);
      return u.hostname.replace(/^www\./, '') + (u.pathname !== '/' ? u.pathname : '');
    } catch {
      return bookmark.url;
    }
  }

  async function handleCopyUrl(id: number, url: string) {
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

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
    if (!confirm('Remove this bookmark?')) return;
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
          className="rounded-full bg-slate-800 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          {showForm ? 'Cancel' : '+ Save bookmark'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="mb-6 rounded-2xl border border-slate-200 p-4">
          <input
            type="url"
            placeholder="https://example.com/artigo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            autoFocus
            className="mb-2 w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400"
          />
          <input
            type="text"
            placeholder="Tags (comma separated)"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            className="mb-2 w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400"
          />
          <textarea
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="mb-3 w-full resize-none rounded-xl border-0 bg-slate-100 px-4 py-3 text-base text-slate-800 outline-none placeholder:text-slate-400"
          />
          {error && <p className="mb-2 text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !url}
            className="rounded-xl bg-slate-800 px-4 py-3 text-base font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </form>
      )}

      {allTags.length > 0 && (
        <div className="mb-4">
          <TabSelect
            options={[
              { id: '', label: 'All tags' },
              ...allTags.map((tag) => ({ id: tag, label: tag })),
            ]}
            value={selectedTag ?? ''}
            onChange={(id) => handleTagFilter(id || undefined)}
            fullWidth
          />
        </div>
      )}

      {bookmarks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-base text-slate-400">
            {selectedTag ? `No bookmarks with tag "${selectedTag}".` : 'No bookmarks saved.'}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Save interesting URLs with{' '}
            <kbd className="rounded border border-slate-200 px-1 py-0.5 text-sm">
              {'\u2318'}K
            </kbd>
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="group rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-w-0 truncate text-base font-medium text-slate-800 hover:underline"
                  >
                    {displayTitle(bookmark)}
                  </a>
                  <span className="shrink-0 text-sm text-slate-500">{timeAgo(bookmark.createdAt)}</span>
                </div>
                {bookmark.title && bookmark.title !== bookmark.url && (
                  <p className="mt-0.5 truncate text-sm text-slate-500">
                    {bookmark.url}
                  </p>
                )}
                {bookmark.tags && bookmark.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {bookmark.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagFilter(tag)}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-sm text-slate-500 hover:bg-slate-200"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                )}
                <div className="mt-1.5 flex items-center gap-2">
                  <button
                    onClick={() => handleCopyUrl(bookmark.id, bookmark.url)}
                    className="rounded-lg px-1.5 py-0.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  >
                    {copiedId === bookmark.id ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button
                    onClick={() => handleRemove(bookmark.id)}
                    disabled={removingId === bookmark.id}
                    className="rounded-lg px-1.5 py-0.5 text-sm text-slate-500 transition-colors hover:bg-red-50 hover:text-red-400 disabled:opacity-50"
                  >
                    {removingId === bookmark.id ? '...' : 'Remove'}
                  </button>
                </div>
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
      )}
    </div>
  );
}
