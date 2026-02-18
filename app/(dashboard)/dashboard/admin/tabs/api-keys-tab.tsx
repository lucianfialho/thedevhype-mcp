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
      <table className="w-full text-left text-base">
        <thead>
          <tr className="border-b border-slate-200 text-sm text-slate-400">
            <th className="pb-2 pr-4 font-medium">Key</th>
            <th className="pb-2 pr-4 font-medium">Owner</th>
            <th className="pb-2 pr-4 font-medium">Tier</th>
            <th className="pb-2 pr-4 font-medium">Req today</th>
            <th className="pb-2 pr-4 font-medium">Req/hour</th>
            <th className="pb-2 pr-4 font-medium">Default state</th>
            <th className="pb-2 pr-4 font-medium">Enabled</th>
            <th className="pb-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {apiKeys.length === 0 && (
            <tr>
              <td colSpan={8} className="py-8 text-center text-sm text-slate-500">
                No API keys found
              </td>
            </tr>
          )}
          {apiKeys.map((key) => (
            <tr
              key={key.id}
              className="border-b border-slate-200"
            >
              <td className="py-3 pr-4">
                <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">
                  {maskKey(key.key)}
                </code>
              </td>
              <td className="py-3 pr-4">
                <p className="text-sm text-slate-800">{key.name}</p>
                <p className="text-[10px] text-slate-500">{key.email}</p>
              </td>
              <td className="py-3 pr-4">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  {key.tier}
                </span>
              </td>
              <td className="py-3 pr-4 text-sm text-slate-500">
                {key.requestsToday}/{key.dailyLimit}
              </td>
              <td className="py-3 pr-4 text-sm text-slate-500">
                {key.requestsThisHour}/{key.rateLimit}
              </td>
              <td className="py-3 pr-4 text-sm text-slate-400">
                {key.defaultState || '—'}
              </td>
              <td className="py-3 pr-4">
                {key.enabled ? (
                  <span className="text-sm text-green-400">yes</span>
                ) : (
                  <span className="text-sm text-red-500">no</span>
                )}
              </td>
              <td className="py-3">
                <button
                  onClick={() => handleToggle(key.id, key.enabled)}
                  disabled={loading === key.id}
                  className={`rounded px-2 py-1 text-[10px] font-medium disabled:opacity-50 ${
                    key.enabled
                      ? 'bg-red-100 text-red-600 hover:bg-red-200'
                      : 'bg-green-100 text-green-600 hover:bg-green-200'
                  }`}
                >
                  {key.enabled ? 'Disable' : 'Enable'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
