'use client';

import { useState } from 'react';
import { getMoreFeed } from '../actions';

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const ACTION_LABELS: Record<string, string> = {
  created: 'criou',
  joined: 'entrou na',
  added: 'adicionou',
  checked: 'marcou como comprado',
  unchecked: 'desmarcou',
  updated: 'atualizou',
  logged: 'registrou',
  created_invite: 'criou convite para',
  changed_role: 'alterou papel de',
  removed: 'removeu',
};

const ENTITY_LABELS: Record<string, string> = {
  family: 'família',
  member: 'família',
  shopping_item: 'item',
  task: 'tarefa',
  note: 'nota',
  expense: 'despesa',
  invite: 'convite',
};

function EntityIcon({ type }: { type: string }) {
  const cls = "h-4 w-4";
  switch (type) {
    case 'family':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      );
    case 'member':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case 'shopping_item':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      );
    case 'task':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'note':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case 'expense':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'invite':
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    default:
      return <span className="text-xs font-medium">?</span>;
  }
}

interface FeedEntry {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  metadata: unknown;
  createdAt: string;
  userName: string | null;
  userNickname: string | null;
}

interface FeedTabProps {
  feed: FeedEntry[];
  familyId: number;
  onFeedChange: (feed: FeedEntry[]) => void;
}

export function FeedTab({ feed, familyId, onFeedChange }: FeedTabProps) {
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(feed.length >= 30);

  async function loadMore() {
    setLoading(true);
    const more = await getMoreFeed(familyId, feed.length, 30);
    if (more.length < 30) setHasMore(false);
    onFeedChange([...feed, ...more]);
    setLoading(false);
  }

  if (feed.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <p className="text-base text-slate-400">Nenhuma atividade ainda.</p>
        <p className="mt-1 text-sm text-slate-500">
          As atividades da família aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Atividade</h3>
      <div className="space-y-2">
        {feed.map((entry) => {
          const name = entry.userNickname || entry.userName || 'Alguém';
          const actionLabel = ACTION_LABELS[entry.action] || entry.action;
          const entityLabel = ENTITY_LABELS[entry.entityType] || entry.entityType.replace('_', ' ');
          const meta = entry.metadata as Record<string, unknown> | null;
          const detail = meta?.item || meta?.title || meta?.description || meta?.name || '';

          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                <EntityIcon type={entry.entityType} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-medium">{name}</span>{' '}
                  {actionLabel}{' '}
                  {entityLabel}
                  {detail ? `: ${String(detail)}` : ''}
                </p>
                <p className="mt-0.5 text-sm text-slate-400">{timeAgo(entry.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="mt-4 w-full rounded-xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200 disabled:opacity-50"
        >
          {loading ? 'Carregando...' : 'Ver mais'}
        </button>
      )}
    </div>
  );
}
