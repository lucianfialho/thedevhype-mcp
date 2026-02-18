'use client';

import { useState } from 'react';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

interface NoteInfo {
  id: number;
  title: string;
  content: string | null;
  pinned: boolean;
  createdByName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface NotesTabProps {
  notes: NoteInfo[];
}

export function NotesTab({ notes }: NotesTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (notes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <p className="text-base text-slate-400">No notes yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">create_note</code> via MCP.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Notes</h3>
      <div className="space-y-3">
        {notes.map((note) => (
          <button
            key={note.id}
            onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
            className="w-full rounded-2xl border border-slate-200 p-4 text-left transition-colors hover:border-slate-300"
          >
            <div className="flex items-baseline gap-2">
              {note.pinned && (
                <span className="shrink-0 text-sm">P</span>
              )}
              <h4 className="min-w-0 flex-1 truncate text-base font-medium text-slate-800">
                {note.title}
              </h4>
              <span className="shrink-0 text-sm text-slate-400">
                {timeAgo(note.updatedAt)}
              </span>
            </div>
            {note.createdByName && (
              <p className="mt-0.5 text-sm text-slate-400">by {note.createdByName}</p>
            )}
            {expandedId === note.id && note.content && (
              <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                {note.content}
              </div>
            )}
            {expandedId !== note.id && note.content && (
              <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                {note.content.slice(0, 150)}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
