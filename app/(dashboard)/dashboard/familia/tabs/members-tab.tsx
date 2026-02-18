'use client';

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-violet-100 text-violet-700',
  member: 'bg-blue-100 text-blue-700',
  viewer: 'bg-slate-100 text-slate-600',
};

interface MemberInfo {
  userId: string;
  role: string;
  nickname: string | null;
  joinedAt: string;
  name: string | null;
  email: string | null;
}

interface InviteInfo {
  id: number;
  familyId: number;
  code: string;
  role: string;
  createdBy: string;
  usedBy: string | null;
  expiresAt: string;
  createdAt: string;
}

interface MembersTabProps {
  members: MemberInfo[];
  invites: InviteInfo[];
}

export function MembersTab({ members, invites }: MembersTabProps) {
  const activeInvites = invites.filter((i) => !i.usedBy && new Date(i.expiresAt) > new Date());

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Members ({members.length})</h3>
      <div className="space-y-2">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-base font-medium text-slate-500">
              {(m.nickname || m.name || '?').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-slate-800">
                {m.nickname || m.name || 'Unknown'}
              </p>
              {m.nickname && m.name && (
                <p className="text-sm text-slate-400">{m.name}</p>
              )}
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-sm font-medium ${ROLE_COLORS[m.role] || ROLE_COLORS.member}`}>
              {m.role}
            </span>
          </div>
        ))}
      </div>

      {activeInvites.length > 0 && (
        <>
          <h4 className="mb-2 mt-6 text-sm font-medium text-slate-500">Active Invites</h4>
          <div className="space-y-2">
            {activeInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-3"
              >
                <code className="text-sm font-mono font-medium text-slate-700">{inv.code}</code>
                <span className="text-sm text-slate-400">
                  as {inv.role}
                </span>
                <span className="ml-auto text-sm text-slate-400">
                  expires {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
