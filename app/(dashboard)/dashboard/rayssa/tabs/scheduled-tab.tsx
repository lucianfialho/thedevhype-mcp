'use client';

import { useState, useTransition } from 'react';
import { unschedulePost, editPost, publishPostNow } from '../actions';
import type { Post } from '@/app/lib/mcp/servers/rayssa.schema';

interface ScheduledTabProps {
  scheduled: Post[];
  onScheduledChange: (scheduled: Post[]) => void;
  onUnscheduled: (post: Post) => void;
  onPublished: (post: Post) => void;
}

function timeUntil(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Publishing soon...';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `in ${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `in ${hours}h ${minutes}m`;
  return `in ${minutes}m`;
}

export function ScheduledTab({
  scheduled,
  onScheduledChange,
  onUnscheduled,
  onPublished,
}: ScheduledTabProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleUnschedule(postId: number) {
    startTransition(async () => {
      const result = await unschedulePost(postId);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onScheduledChange(scheduled.filter((s) => s.id !== postId));
        onUnscheduled(result.data);
      }
    });
  }

  function handleSaveEdit(postId: number) {
    startTransition(async () => {
      const result = await editPost(postId, editContent);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onScheduledChange(scheduled.map((s) => (s.id === postId ? result.data! : s)));
        setEditingId(null);
      }
    });
  }

  function handlePublishNow(postId: number) {
    startTransition(async () => {
      const result = await publishPostNow(postId);
      if (result.error) {
        setError(result.error);
        return;
      }
      const post = scheduled.find((s) => s.id === postId);
      if (post) {
        onScheduledChange(scheduled.filter((s) => s.id !== postId));
        onPublished({
          ...post,
          status: 'published',
          publishedAt: new Date().toISOString(),
          platformPostUrl: result.data || null,
        });
      }
    });
  }

  if (scheduled.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-slate-400">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        <p className="text-base text-slate-500">No scheduled posts</p>
        <p className="mt-1 text-sm text-slate-400">Schedule drafts from the Drafts tab.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {scheduled.map((post) => (
        <div
          key={post.id}
          className={`rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300 ${isPending ? 'opacity-60' : ''}`}
        >
          {editingId === post.id ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleSaveEdit(post.id)}
                  disabled={isPending || editContent.length === 0 || editContent.length > 280}
                  className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{post.content}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {post.scheduledAt ? timeUntil(post.scheduledAt) : 'Scheduled'}
                </span>
                <span className="text-xs text-slate-400">
                  {post.scheduledAt
                    ? new Date(post.scheduledAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setEditingId(post.id);
                    setEditContent(post.content);
                    setError(null);
                  }}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                >
                  Edit
                </button>
                <button
                  onClick={() => handlePublishNow(post.id)}
                  disabled={isPending}
                  className="rounded-lg bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
                >
                  Publish now
                </button>
                <button
                  onClick={() => handleUnschedule(post.id)}
                  disabled={isPending}
                  className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
                >
                  Cancel schedule
                </button>
              </div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
