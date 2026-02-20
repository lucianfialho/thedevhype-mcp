'use client';

import { useState, useTransition } from 'react';
import { editPost, deletePost, schedulePost, publishPostNow } from '../actions';
import type { Post } from '@/app/lib/mcp/servers/rayssa.schema';

interface DraftsTabProps {
  drafts: Post[];
  onDraftsChange: (drafts: Post[]) => void;
  onScheduled: (post: Post) => void;
  onPublished: (post: Post) => void;
}

export function DraftsTab({ drafts, onDraftsChange, onScheduled, onPublished }: DraftsTabProps) {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [schedulingId, setSchedulingId] = useState<number | null>(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function startEditing(post: Post) {
    setEditingId(post.id);
    setEditContent(post.content);
    setError(null);
  }

  function handleSaveEdit(postId: number) {
    startTransition(async () => {
      const result = await editPost(postId, editContent);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onDraftsChange(drafts.map((d) => (d.id === postId ? result.data! : d)));
        setEditingId(null);
      }
    });
  }

  function handleDelete(postId: number) {
    startTransition(async () => {
      const result = await deletePost(postId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDraftsChange(drafts.filter((d) => d.id !== postId));
    });
  }

  function handleSchedule(postId: number) {
    if (!scheduleDate) return;
    startTransition(async () => {
      const result = await schedulePost(postId, new Date(scheduleDate).toISOString());
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onDraftsChange(drafts.filter((d) => d.id !== postId));
        onScheduled(result.data);
        setSchedulingId(null);
        setScheduleDate('');
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
      const post = drafts.find((d) => d.id === postId);
      if (post) {
        onDraftsChange(drafts.filter((d) => d.id !== postId));
        onPublished({
          ...post,
          status: 'published',
          publishedAt: new Date().toISOString(),
          platformPostUrl: result.data || null,
        });
      }
    });
  }

  if (drafts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-slate-400">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        <p className="text-base text-slate-500">No drafts yet</p>
        <p className="mt-1 text-sm text-slate-400">Go to Compose to create your first post.</p>
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
      {drafts.map((draft) => (
        <div
          key={draft.id}
          className={`rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300 ${isPending ? 'opacity-60' : ''}`}
        >
          {editingId === draft.id ? (
            <div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={() => handleSaveEdit(draft.id)}
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
              <p className="whitespace-pre-wrap text-sm text-slate-700">{draft.content}</p>
              <p className="mt-2 text-xs text-slate-400">
                {new Date(draft.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>

              {schedulingId === draft.id ? (
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="datetime-local"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm focus:border-slate-400 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSchedule(draft.id)}
                    disabled={isPending || !scheduleDate}
                    className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
                  >
                    Set
                  </button>
                  <button
                    onClick={() => { setSchedulingId(null); setScheduleDate(''); }}
                    className="rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => startEditing(draft)}
                    className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setSchedulingId(draft.id)}
                    className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                  >
                    Schedule
                  </button>
                  <button
                    onClick={() => handlePublishNow(draft.id)}
                    disabled={isPending}
                    className="rounded-lg bg-sky-50 px-3 py-1.5 text-sm font-medium text-sky-700 hover:bg-sky-100"
                  >
                    Publish now
                  </button>
                  <button
                    onClick={() => handleDelete(draft.id)}
                    disabled={isPending}
                    className="rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ))}
    </div>
  );
}
