'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AdminUser, UserMcpAccessRow } from '../actions';
import { banUser, unbanUser, setUserRole } from '../actions';

interface UsersTabProps {
  users: AdminUser[];
  userMcps: UserMcpAccessRow[];
  onRefresh: () => void;
}

export function UsersTab({ users, userMcps, onRefresh }: UsersTabProps) {
  const router = useRouter();
  const [banModal, setBanModal] = useState<{ userId: string; name: string } | null>(null);
  const [banReason, setBanReason] = useState('');
  const [loading, setLoading] = useState<string | null>(null);

  async function handleBan() {
    if (!banModal) return;
    setLoading(banModal.userId);
    await banUser(banModal.userId, banReason);
    setBanModal(null);
    setBanReason('');
    setLoading(null);
    onRefresh();
  }

  async function handleUnban(userId: string) {
    setLoading(userId);
    await unbanUser(userId);
    setLoading(null);
    onRefresh();
  }

  async function handleToggleAdmin(userId: string, currentRole: string | null) {
    setLoading(userId);
    await setUserRole(userId, currentRole === 'admin' ? null : 'admin');
    setLoading(null);
    onRefresh();
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-base">
          <thead>
            <tr className="border-b border-slate-200 text-sm text-slate-400">
              <th className="pb-2 pr-4 font-medium">User</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-slate-200"
              >
                <td className="py-3 pr-4">
                  <button
                    onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                    className="flex items-center gap-2 hover:opacity-70"
                  >
                    {user.image && (
                      <img
                        src={user.image}
                        alt=""
                        className="h-6 w-6 rounded-full"
                      />
                    )}
                    <p className="font-medium text-slate-800">{user.name}</p>
                  </button>
                </td>
                <td className="py-3 pr-4">
                  {user.role === 'admin' ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700">
                      admin
                    </span>
                  ) : (
                    <span className="text-sm text-slate-500">user</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {user.banned ? (
                    <div>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700">
                        banned
                      </span>
                      {user.banReason && (
                        <p className="mt-0.5 text-[10px] text-slate-500">{user.banReason}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-green-400">active</span>
                  )}
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    {user.banned ? (
                      <button
                        onClick={() => handleUnban(user.id)}
                        disabled={loading === user.id}
                        className="rounded bg-green-100 px-2 py-1 text-[10px] font-medium text-green-600 hover:bg-green-200 disabled:opacity-50"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => setBanModal({ userId: user.id, name: user.name })}
                        disabled={loading === user.id}
                        className="rounded bg-red-100 px-2 py-1 text-[10px] font-medium text-red-600 hover:bg-red-200 disabled:opacity-50"
                      >
                        Ban
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleAdmin(user.id, user.role)}
                      disabled={loading === user.id}
                      className="rounded bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500 hover:bg-slate-200 disabled:opacity-50"
                    >
                      {user.role === 'admin' ? 'Remove admin' : 'Make admin'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Ban Modal */}
      {banModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-base font-semibold text-slate-800">
              Ban {banModal.name}
            </h3>
            <p className="mt-1 text-sm text-slate-400">Provide the ban reason:</p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Reason..."
              rows={3}
              className="mt-3 w-full rounded-md border border-slate-200 bg-slate-100 px-3 py-2 text-base text-slate-800 focus:border-slate-400 focus:outline-none"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setBanModal(null); setBanReason(''); }}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim() || loading === banModal.userId}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
