'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '../../../components/ui';
import type { UserDetail } from '../../actions';
import { banUser, unbanUser, setUserRole, approveWaitlistEntry, rejectWaitlistEntry } from '../../actions';

export function UserDetailView({ user }: { user: UserDetail }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleBan() {
    const reason = prompt('Ban reason:');
    if (!reason) return;
    setLoading(true);
    await banUser(user.id, reason);
    router.refresh();
    setLoading(false);
  }

  async function handleUnban() {
    setLoading(true);
    await unbanUser(user.id);
    router.refresh();
    setLoading(false);
  }

  async function handleToggleAdmin() {
    setLoading(true);
    await setUserRole(user.id, user.role === 'admin' ? null : 'admin');
    router.refresh();
    setLoading(false);
  }

  async function handleApproveWaitlist() {
    if (!user.waitlist) return;
    setLoading(true);
    await approveWaitlistEntry(user.waitlist.id);
    router.refresh();
    setLoading(false);
  }

  async function handleRejectWaitlist() {
    if (!user.waitlist) return;
    setLoading(true);
    await rejectWaitlistEntry(user.waitlist.id);
    router.refresh();
    setLoading(false);
  }

  return (
    <AppShell title={user.name}>
      {/* Back link */}
      <button
        onClick={() => router.push('/dashboard/admin?tab=usuarios')}
        className="mb-6 flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 4l-4 4 4 4" />
        </svg>
        Back to Users
      </button>

      {/* User header */}
      <div className="flex items-center gap-4">
        {user.image && (
          <img src={user.image} alt="" className="h-14 w-14 rounded-full" />
        )}
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-slate-800">{user.name}</h2>
          <p className="text-sm text-slate-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'admin' && (
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">admin</span>
          )}
          {user.banned && (
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">banned</span>
          )}
        </div>
      </div>

      <div className="mt-2 text-xs text-slate-400">
        Joined {new Date(user.createdAt).toLocaleDateString()}
        {user.banReason && <span className="ml-2 text-red-400">Ban reason: {user.banReason}</span>}
      </div>

      {/* Actions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {user.banned ? (
          <button
            onClick={handleUnban}
            disabled={loading}
            className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200 disabled:opacity-50"
          >
            Unban
          </button>
        ) : (
          <button
            onClick={handleBan}
            disabled={loading}
            className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
          >
            Ban
          </button>
        )}
        <button
          onClick={handleToggleAdmin}
          disabled={loading}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 disabled:opacity-50"
        >
          {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
        </button>
      </div>

      {/* Waitlist */}
      <section className="mt-8">
        <h3 className="text-sm font-semibold text-slate-800">Waitlist</h3>
        {user.waitlist ? (
          <div className="mt-3 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                user.waitlist.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : user.waitlist.status === 'rejected'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-amber-100 text-amber-700'
              }`}>
                {user.waitlist.status}
              </span>
              <span className="text-xs text-slate-400">
                {new Date(user.waitlist.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="mt-3 space-y-2 text-sm">
              <div>
                <span className="text-slate-400">Building:</span>{' '}
                <span className="text-slate-700">{user.waitlist.building}</span>
              </div>
              <div>
                <span className="text-slate-400">AI Tools:</span>{' '}
                <span className="text-slate-700">{user.waitlist.aiTools}</span>
              </div>
              {user.waitlist.mcpExcitement && (
                <div>
                  <span className="text-slate-400">MCP Excitement:</span>{' '}
                  <span className="text-slate-700">{user.waitlist.mcpExcitement}</span>
                </div>
              )}
            </div>
            {user.waitlist.status === 'pending' && (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={handleApproveWaitlist}
                  disabled={loading}
                  className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={handleRejectWaitlist}
                  disabled={loading}
                  className="rounded-lg border border-slate-200 px-4 py-1.5 text-xs font-medium text-slate-500 hover:border-slate-300 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No waitlist entry (existing user)</p>
        )}
      </section>

      {/* MCPs */}
      <section className="mt-8">
        <h3 className="text-sm font-semibold text-slate-800">MCP Servers</h3>
        {user.mcps.length > 0 ? (
          <div className="mt-3 space-y-2">
            {user.mcps.map((mcp) => (
              <div key={mcp.mcpName} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium capitalize text-slate-800">{mcp.mcpName}</span>
                  {mcp.hasApiKey && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">has key</span>
                  )}
                </div>
                <span className={`text-xs ${mcp.enabled ? 'text-green-500' : 'text-slate-400'}`}>
                  {mcp.enabled ? 'enabled' : 'disabled'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No MCP servers configured</p>
        )}
      </section>

      {/* API Keys */}
      <section className="mt-8">
        <h3 className="text-sm font-semibold text-slate-800">API Keys</h3>
        {user.apiKeys.length > 0 ? (
          <div className="mt-3 space-y-2">
            {user.apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3">
                <div>
                  <span className="text-sm font-medium text-slate-800">{key.name}</span>
                  <span className="ml-2 text-xs text-slate-400">{key.tier}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {key.requestsToday}/{key.dailyLimit} today
                  </span>
                  <span className={`text-xs ${key.enabled ? 'text-green-500' : 'text-red-400'}`}>
                    {key.enabled ? 'active' : 'disabled'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-400">No API keys</p>
        )}
      </section>
    </AppShell>
  );
}
