'use client';

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
  created: 'created',
  joined: 'joined',
  added: 'added',
  checked: 'checked off',
  unchecked: 'unchecked',
  updated: 'updated',
  logged: 'logged',
  created_invite: 'created invite',
  changed_role: 'changed role',
  removed: 'removed',
};

const ENTITY_ICONS: Record<string, string> = {
  family: 'F',
  member: 'M',
  shopping_item: 'S',
  task: 'T',
  note: 'N',
  expense: '$',
  invite: 'I',
};

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
}

export function FeedTab({ feed }: FeedTabProps) {
  if (feed.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <p className="text-base text-slate-400">No activity yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Family activity will appear here.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Activity</h3>
      <div className="space-y-2">
        {feed.map((entry) => {
          const name = entry.userNickname || entry.userName || 'Someone';
          const actionLabel = ACTION_LABELS[entry.action] || entry.action;
          const icon = ENTITY_ICONS[entry.entityType] || '?';
          const meta = entry.metadata as Record<string, unknown> | null;
          const detail = meta?.item || meta?.title || meta?.description || meta?.name || '';

          return (
            <div
              key={entry.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-500">
                {icon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-medium">{name}</span>{' '}
                  {actionLabel}{' '}
                  {entry.entityType.replace('_', ' ')}
                  {detail ? `: ${String(detail)}` : ''}
                </p>
                <p className="mt-0.5 text-sm text-slate-400">{timeAgo(entry.createdAt)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
