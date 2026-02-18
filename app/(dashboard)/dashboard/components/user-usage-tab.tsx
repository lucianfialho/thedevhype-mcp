'use client';

import type { UserMcpUsageStats } from './user-mcp-usage';

interface UserUsageTabProps {
  stats: UserMcpUsageStats;
}

export function UserUsageTab({ stats }: UserUsageTabProps) {
  const maxToolCount = stats.byTool.length > 0
    ? Math.max(...stats.byTool.map((t) => t.count))
    : 1;

  const total = stats.totalCalls.month;

  return (
    <div>
      {/* Stats cards */}
      <div className="mb-5 grid grid-cols-3 gap-2">
        <div className="rounded-2xl border border-slate-200 p-3">
          <p className="text-sm text-slate-500">Today</p>
          <p className="mt-0.5 text-xl font-bold text-slate-800">{stats.totalCalls.today}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-3">
          <p className="text-sm text-slate-500">7 days</p>
          <p className="mt-0.5 text-xl font-bold text-slate-800">{stats.totalCalls.week}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 p-3">
          <p className="text-sm text-slate-500">30 days</p>
          <p className="mt-0.5 text-xl font-bold text-slate-800">{stats.totalCalls.month}</p>
        </div>
      </div>

      {/* Errors badge */}
      {stats.errors > 0 && (
        <div className="mb-5 flex items-center gap-2 rounded-xl bg-red-50 px-4 py-2.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#dc2626" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5v3.5M8 10.5v.5" />
          </svg>
          <span className="text-sm font-medium text-red-400">{stats.errors} errors in the last 30 days</span>
        </div>
      )}

      {/* Tools list */}
      <div>
        <p className="mb-3 text-sm font-medium text-slate-500">Most used tools (30d)</p>
        {stats.byTool.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-slate-400">
              <path d="M12 20V10M18 20V4M6 20v-4" />
            </svg>
            <p className="text-sm text-slate-500">No data yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {stats.byTool.map((tool, i) => {
              const pct = total > 0 ? ((tool.count / total) * 100).toFixed(0) : '0';
              return (
                <div
                  key={tool.toolName}
                  className="rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between">
                    <span className="truncate text-base text-slate-800">
                      {tool.toolName}
                    </span>
                    <div className="ml-3 flex shrink-0 items-center gap-2">
                      <span className="text-base font-semibold text-slate-800">
                        {tool.count}
                      </span>
                      <span className="w-10 text-right text-sm text-slate-500">{pct}%</span>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-800 transition-all"
                        style={{ width: `${(tool.count / maxToolCount) * 100}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-sm text-slate-500">~{tool.avgDuration}ms</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
