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
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Today</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{stats.today}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">7 days</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{stats.week}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">30 days</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{stats.month}</p>
        </div>
      </div>

      {/* Status codes breakdown */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-slate-800">Status codes (30d)</h3>
        <div className="flex gap-3">
          {stats.statusBreakdown.map((s) => (
            <div
              key={s.statusGroup}
              className="flex-1 rounded-lg border border-slate-200 p-3"
            >
              <p className={`text-sm font-medium ${
                s.statusGroup === '2xx'
                  ? 'text-green-400'
                  : s.statusGroup === '4xx'
                    ? 'text-yellow-400'
                    : s.statusGroup === '5xx'
                      ? 'text-red-400'
                      : 'text-slate-400'
              }`}>
                {s.statusGroup}
              </p>
              <p className="mt-1 text-lg font-bold text-slate-800">{s.count}</p>
            </div>
          ))}
          {stats.statusBreakdown.length === 0 && (
            <p className="text-sm text-slate-500">No data</p>
          )}
        </div>
      </div>

      {/* Top endpoints */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-slate-800">Top endpoints (30d)</h3>
        {stats.topEndpoints.length === 0 ? (
          <p className="text-sm text-slate-500">No data</p>
        ) : (
          <div className="space-y-2">
            {stats.topEndpoints.map((ep) => (
              <div key={`${ep.method}-${ep.endpoint}`} className="flex items-center gap-3">
                <span className="w-12 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-center text-[10px] font-medium text-slate-500">
                  {ep.method}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                  {ep.endpoint}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-400"
                      style={{ width: `${(ep.count / maxEndpointCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 shrink-0 text-right text-sm font-medium text-slate-500">
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
