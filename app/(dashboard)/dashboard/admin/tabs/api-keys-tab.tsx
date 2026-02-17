'use client';

import { useState } from 'react';
import type { AdminApiKey } from '../actions';
import { toggleApiKeyEnabled } from '../actions';

interface ApiKeysTabProps {
  apiKeys: AdminApiKey[];
  onRefresh: () => void;
}

function maskKey(key: string): string {
  return `${key.slice(0, 6)}****${key.slice(-4)}`;
}

export function ApiKeysTab({ apiKeys, onRefresh }: ApiKeysTabProps) {
  const [loading, setLoading] = useState<number | null>(null);

  async function handleToggle(keyId: number, currentEnabled: boolean) {
    setLoading(keyId);
    await toggleApiKeyEnabled(keyId, !currentEnabled);
    setLoading(null);
    onRefresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 text-xs text-zinc-500 dark:border-zinc-700">
            <th className="pb-2 pr-4 font-medium">Key</th>
            <th className="pb-2 pr-4 font-medium">Owner</th>
            <th className="pb-2 pr-4 font-medium">Tier</th>
            <th className="pb-2 pr-4 font-medium">Req hoje</th>
            <th className="pb-2 pr-4 font-medium">Req/hora</th>
            <th className="pb-2 pr-4 font-medium">Estado padrao</th>
            <th className="pb-2 pr-4 font-medium">Habilitada</th>
            <th className="pb-2 font-medium">Acao</th>
          </tr>
        </thead>
        <tbody>
          {apiKeys.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-xs text-zinc-400">
                Nenhuma API key encontrada
              </td>
            </tr>
          )}
          {apiKeys.map((key) => (
            <tr
              key={key.id}
              className="border-b border-zinc-100 dark:border-zinc-800"
            >
              <td className="py-3 pr-4">
                <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs dark:bg-zinc-800">
                  {maskKey(key.key)}
                </code>
              </td>
              <td className="py-3 pr-4">
                <p className="text-xs text-zinc-900 dark:text-zinc-100">{key.name}</p>
                <p className="text-[10px] text-zinc-400">{key.email}</p>
              </td>
              <td className="py-3 pr-4">
                <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {key.tier}
                </span>
              </td>
              <td className="py-3 pr-4 text-xs text-zinc-600 dark:text-zinc-400">
                {key.requestsToday}/{key.dailyLimit}
              </td>
              <td className="py-3 pr-4 text-xs text-zinc-600 dark:text-zinc-400">
                {key.requestsThisHour}/{key.rateLimit}
              </td>
              <td className="py-3 pr-4 text-xs text-zinc-500">
                {key.defaultState || '—'}
              </td>
              <td className="py-3 pr-4">
                {key.enabled ? (
                  <span className="text-xs text-green-600 dark:text-green-400">sim</span>
                ) : (
                  <span className="text-xs text-red-500">nao</span>
                )}
              </td>
              <td className="py-3">
                <button
                  onClick={() => handleToggle(key.id, key.enabled)}
                  disabled={loading === key.id}
                  className={`rounded px-2 py-1 text-[10px] font-medium disabled:opacity-50 ${
                    key.enabled
                      ? 'bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400'
                  }`}
                >
                  {key.enabled ? 'Desabilitar' : 'Habilitar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
