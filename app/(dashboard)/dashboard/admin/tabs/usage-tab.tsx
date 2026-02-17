'use client';

import type { ApiUsageStats } from '../actions';

interface UsageTabProps {
  stats: ApiUsageStats;
}

export function UsageTab({ stats }: UsageTabProps) {
  const maxEndpointCount = stats.topEndpoints.length > 0
    ? Math.max(...stats.topEndpoints.map((e) => e.count))
    : 1;

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-400">Hoje</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.today}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-400">7 dias</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.week}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-700">
          <p className="text-xs text-zinc-400">30 dias</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.month}</p>
        </div>
      </div>

      {/* Status codes breakdown */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Status codes (30d)</h3>
        <div className="flex gap-3">
          {stats.statusBreakdown.map((s) => (
            <div
              key={s.statusGroup}
              className="flex-1 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700"
            >
              <p className={`text-xs font-medium ${
                s.statusGroup === '2xx'
                  ? 'text-green-600 dark:text-green-400'
                  : s.statusGroup === '4xx'
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : s.statusGroup === '5xx'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-zinc-500'
              }`}>
                {s.statusGroup}
              </p>
              <p className="mt-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">{s.count}</p>
            </div>
          ))}
          {stats.statusBreakdown.length === 0 && (
            <p className="text-xs text-zinc-400">Sem dados</p>
          )}
        </div>
      </div>

      {/* Top endpoints */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Top endpoints (30d)</h3>
        {stats.topEndpoints.length === 0 ? (
          <p className="text-xs text-zinc-400">Sem dados</p>
        ) : (
          <div className="space-y-2">
            {stats.topEndpoints.map((ep) => (
              <div key={`${ep.method}-${ep.endpoint}`} className="flex items-center gap-3">
                <span className="w-12 shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-center text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                  {ep.method}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-700 dark:text-zinc-300">
                  {ep.endpoint}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-400"
                      style={{ width: `${(ep.count / maxEndpointCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {ep.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
