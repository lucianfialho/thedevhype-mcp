'use client';

import { useState } from 'react';
import { addNote, toggleNotePin, deleteNote } from '../actions';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

function PinIcon({ pinned }: { pinned: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill={pinned ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={pinned ? 'text-amber-500' : 'text-slate-400'}
    >
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24z" />
    </svg>
  );
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
  familyId: number;
  onNotesChange: (notes: NoteInfo[]) => void;
}

export function NotesTab({ notes, familyId, onNotesChange }: NotesTabProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError('');
    const res = await addNote(familyId, title.trim(), content);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      const newNote: NoteInfo = {
        id: res.data.id,
        title: res.data.title,
        content: res.data.content,
        pinned: false,
        createdByName: 'Você',
        createdAt: res.data.createdAt,
        updatedAt: res.data.updatedAt,
      };
      onNotesChange([newNote, ...notes]);
      setTitle('');
      setContent('');
      setShowForm(false);
    }
    setSubmitting(false);
  }

  function handleDelete(note: NoteInfo, e: React.MouseEvent) {
    e.stopPropagation();
    onNotesChange(notes.filter((n) => n.id !== note.id));
    deleteNote(familyId, note.id);
  }

  function handleTogglePin(note: NoteInfo, e: React.MouseEvent) {
    e.stopPropagation();
    const newPinned = !note.pinned;
    // Optimistic: toggle + reorder (pinned first)
    const updated = notes
      .map((n) => (n.id === note.id ? { ...n, pinned: newPinned } : n))
      .sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
    onNotesChange(updated);
    // Fire and forget
    toggleNotePin(familyId, note.id, newPinned);
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Notas</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
        >
          {showForm ? 'Cancelar' : '+ Nova nota'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-2xl border border-slate-200 p-4">
          <input
            type="text"
            placeholder="Título da nota"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            required
            autoFocus
          />
          <textarea
            placeholder="Conteúdo (markdown)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            rows={4}
          />
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? 'Criando...' : 'Criar nota'}
          </button>
        </form>
      )}

      {notes.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-base text-slate-400">Nenhuma nota ainda.</p>
          <p className="mt-1 text-sm text-slate-500">
            Clique em &quot;+ Nova nota&quot; para começar.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {notes.map((note) => (
          <div
            key={note.id}
            className="w-full rounded-2xl border border-slate-200 p-4 text-left transition-colors hover:border-slate-300"
          >
            <div className="flex items-baseline gap-2">
              <button
                onClick={(e) => handleTogglePin(note, e)}
                className="shrink-0 rounded p-0.5 transition-colors hover:bg-slate-100"
                title={note.pinned ? 'Desafixar' : 'Fixar'}
              >
                <PinIcon pinned={note.pinned} />
              </button>
              <button
                onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
                className="min-w-0 flex-1 text-left"
              >
                <h4 className="truncate text-base font-medium text-slate-800">
                  {note.title}
                </h4>
              </button>
              <span className="shrink-0 text-sm text-slate-400">
                {timeAgo(note.updatedAt)}
              </span>
              <button
                onClick={(e) => handleDelete(note, e)}
                className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-red-500"
                title="Excluir nota"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
            {note.createdByName && (
              <p className="mt-0.5 pl-7 text-sm text-slate-400">por {note.createdByName}</p>
            )}
            <button
              onClick={() => setExpandedId(expandedId === note.id ? null : note.id)}
              className="w-full text-left"
            >
              {expandedId === note.id && note.content && (
                <div className="mt-3 whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                  {note.content}
                </div>
              )}
              {expandedId !== note.id && note.content && (
                <p className="mt-1 pl-7 line-clamp-2 text-sm text-slate-500">
                  {note.content.slice(0, 150)}
                </p>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
