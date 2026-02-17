'use client';

import type { UserMcpUsageStats } from './user-mcp-usage';

interface UserUsageTabProps {
  stats: UserMcpUsageStats;
}

export function UserUsageTab({ stats }: UserUsageTabProps) {
  const maxToolCount = stats.byTool.length > 0
    ? Math.max(...stats.byTool.map((t) => t.count))
    : 1;

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Hoje</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalCalls.today}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">7 dias</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalCalls.week}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">30 dias</p>
          <p className="mt-1 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{stats.totalCalls.month}</p>
        </div>
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-xs text-zinc-400">Erros (30d)</p>
          <p className={`mt-1 text-2xl font-bold ${stats.errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-zinc-900 dark:text-zinc-100'}`}>
            {stats.errors}
          </p>
        </div>
      </div>

      {/* Usage by tool */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tools mais usadas (30d)</h3>
        {stats.byTool.length === 0 ? (
          <p className="text-xs text-zinc-400">Sem dados ainda</p>
        ) : (
          <div className="space-y-2">
            {stats.byTool.map((tool) => (
              <div key={tool.toolName} className="flex items-center gap-3">
                <span className="min-w-0 flex-1 truncate text-xs text-zinc-700 dark:text-zinc-300">
                  {tool.toolName}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-zinc-400"
                      style={{ width: `${(tool.count / maxToolCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    {tool.count}
                  </span>
                  <span className="w-14 shrink-0 text-right text-[10px] text-zinc-400">
                    ~{tool.avgDuration}ms
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
