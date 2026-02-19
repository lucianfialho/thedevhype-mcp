'use client';

import { useState } from 'react';
import { generateInvite } from '../actions';

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
  familyId: number;
  currentUserRole: string;
  onInvitesChange: (invites: InviteInfo[]) => void;
}

export function MembersTab({ members, invites, familyId, currentUserRole, onInvitesChange }: MembersTabProps) {
  const [inviteRole, setInviteRole] = useState('member');
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [error, setError] = useState('');

  const activeInvites = invites.filter((i) => !i.usedBy && new Date(i.expiresAt) > new Date());
  const isAdmin = currentUserRole === 'admin';

  async function handleGenerateInvite() {
    setGenerating(true);
    setError('');
    const res = await generateInvite(familyId, inviteRole);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      onInvitesChange([res.data, ...invites]);
    }
    setGenerating(false);
  }

  async function handleCopy(code: string) {
    await navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Membros ({members.length})</h3>
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
                {m.nickname || m.name || 'Desconhecido'}
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

      {/* Admin: Generate invite */}
      {isAdmin && (
        <div className="mt-6">
          <h4 className="mb-3 text-base font-semibold text-slate-800">Gerar convite</h4>
          {error && (
            <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          <div className="flex gap-2">
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="flex-1 rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="member">Membro</option>
              <option value="viewer">Visualizador</option>
            </select>
            <button
              onClick={handleGenerateInvite}
              disabled={generating}
              className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              {generating ? 'Gerando...' : 'Gerar convite'}
            </button>
          </div>
        </div>
      )}

      {activeInvites.length > 0 && (
        <>
          <h4 className="mb-2 mt-6 text-sm font-medium text-slate-500">Convites ativos</h4>
          <div className="space-y-2">
            {activeInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-3"
              >
                <code className="text-sm font-mono font-medium text-slate-700">{inv.code}</code>
                <span className="text-sm text-slate-400">
                  como {inv.role}
                </span>
                <span className="text-sm text-slate-400">
                  expira {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                </span>
                <button
                  onClick={() => handleCopy(inv.code)}
                  className="ml-auto shrink-0 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
                >
                  {copiedCode === inv.code ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
