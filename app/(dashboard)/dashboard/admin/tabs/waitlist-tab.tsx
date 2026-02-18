'use client';

import { useState } from 'react';
import type { WaitlistEntry } from '../actions';
import { approveWaitlistEntry, rejectWaitlistEntry } from '../actions';

interface WaitlistTabProps {
  entries: WaitlistEntry[];
  onRefresh: () => void;
}

export function WaitlistTab({ entries, onRefresh }: WaitlistTabProps) {
  const [loading, setLoading] = useState<number | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.status === filter);
  const counts = {
    all: entries.length,
    pending: entries.filter((e) => e.status === 'pending').length,
    approved: entries.filter((e) => e.status === 'approved').length,
    rejected: entries.filter((e) => e.status === 'rejected').length,
  };

  async function handleApprove(id: number) {
    setLoading(id);
    await approveWaitlistEntry(id);
    setLoading(null);
    onRefresh();
  }

  async function handleReject(id: number) {
    setLoading(id);
    await rejectWaitlistEntry(id);
    setLoading(null);
    onRefresh();
  }

  return (
    <div>
      {/* Stats */}
      <div className="mb-4 grid grid-cols-4 gap-3">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-xl border p-3 text-left transition-colors ${
              filter === key
                ? 'border-slate-800 bg-slate-800/5'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="text-2xl font-bold text-slate-800">{counts[key]}</div>
            <div className="text-xs capitalize text-slate-400">{key}</div>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-slate-200 text-sm text-slate-400">
              <th className="pb-2 pr-4 font-medium">#</th>
              <th className="pb-2 pr-4 font-medium">User</th>
              <th className="pb-2 pr-4 font-medium">Building</th>
              <th className="pb-2 pr-4 font-medium">AI Tools</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Date</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((entry) => (
              <tr key={entry.id} className="border-b border-slate-200">
                <td className="py-3 pr-4 text-sm text-slate-400">{entry.id}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {entry.userImage && (
                      <img src={entry.userImage} alt="" className="h-7 w-7 rounded-full" />
                    )}
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{entry.userName}</div>
                      <div className="text-xs text-slate-400 truncate">{entry.userEmail}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4 text-sm text-slate-600">{entry.building}</td>
                <td className="py-3 pr-4 text-sm text-slate-600 max-w-[150px] truncate">{entry.aiTools}</td>
                <td className="py-3 pr-4">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.status === 'approved'
                      ? 'bg-emerald-100 text-emerald-700'
                      : entry.status === 'rejected'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}>
                    {entry.status}
                  </span>
                </td>
                <td className="py-3 pr-4 text-xs text-slate-400">
                  {new Date(entry.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3">
                  {entry.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(entry.id)}
                        disabled={loading === entry.id}
                        className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {loading === entry.id ? '...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleReject(entry.id)}
                        disabled={loading === entry.id}
                        className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500 hover:border-slate-300 disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {entry.status === 'approved' && (
                    <span className="text-xs text-slate-400">
                      {entry.approvedAt ? new Date(entry.approvedAt).toLocaleDateString() : '—'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center text-sm text-slate-400">
                  No {filter === 'all' ? '' : filter} entries
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
