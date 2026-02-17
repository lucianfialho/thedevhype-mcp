'use client';

import { useState } from 'react';
import type { AdminUser } from '../actions';
import { banUser, unbanUser, setUserRole } from '../actions';

interface UsersTabProps {
  users: AdminUser[];
  onRefresh: () => void;
}

export function UsersTab({ users, onRefresh }: UsersTabProps) {
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
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-700">
              <th className="pb-2 pr-4 font-medium">Usuario</th>
              <th className="pb-2 pr-4 font-medium">Role</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">MCPs</th>
              <th className="pb-2 pr-4 font-medium">API Key</th>
              <th className="pb-2 font-medium">Acoes</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-zinc-100 dark:border-zinc-800"
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {user.image && (
                      <img
                        src={user.image}
                        alt=""
                        className="h-6 w-6 rounded-full"
                      />
                    )}
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">{user.name}</p>
                      <p className="text-xs text-zinc-400">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 pr-4">
                  {user.role === 'admin' ? (
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      admin
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-400">user</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {user.banned ? (
                    <div>
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:bg-red-900 dark:text-red-300">
                        banido
                      </span>
                      {user.banReason && (
                        <p className="mt-0.5 text-[10px] text-zinc-400">{user.banReason}</p>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-green-600 dark:text-green-400">ativo</span>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs text-zinc-500">{user.mcpCount}</span>
                </td>
                <td className="py-3 pr-4">
                  <span className="text-xs text-zinc-500">{user.apiKeyCount > 0 ? 'sim' : 'nao'}</span>
                </td>
                <td className="py-3">
                  <div className="flex items-center gap-1">
                    {user.banned ? (
                      <button
                        onClick={() => handleUnban(user.id)}
                        disabled={loading === user.id}
                        className="rounded bg-green-50 px-2 py-1 text-[10px] font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/30 dark:text-green-400"
                      >
                        Unban
                      </button>
                    ) : (
                      <button
                        onClick={() => setBanModal({ userId: user.id, name: user.name })}
                        disabled={loading === user.id}
                        className="rounded bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400"
                      >
                        Ban
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleAdmin(user.id, user.role)}
                      disabled={loading === user.id}
                      className="rounded bg-zinc-100 px-2 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-200 disabled:opacity-50 dark:bg-zinc-800 dark:text-zinc-400"
                    >
                      {user.role === 'admin' ? 'Remover admin' : 'Promover admin'}
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
          <div className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Banir {banModal.name}
            </h3>
            <p className="mt-1 text-xs text-zinc-500">Informe o motivo do ban:</p>
            <textarea
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Motivo..."
              rows={3}
              className="mt-3 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm focus:border-zinc-400 focus:outline-none dark:border-zinc-700 dark:bg-zinc-800"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => { setBanModal(null); setBanReason(''); }}
                className="rounded-md px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleBan}
                disabled={!banReason.trim() || loading === banModal.userId}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Confirmar Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
