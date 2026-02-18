'use client';

import type { McpUsageStats } from '../actions';

interface McpsTabProps {
  stats: McpUsageStats;
}

export function McpsTab({ stats }: McpsTabProps) {
  const maxToolCount = stats.byTool.length > 0
    ? Math.max(...stats.byTool.map((t) => t.count))
    : 1;

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Today</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{stats.totalCalls.today}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">7 days</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{stats.totalCalls.week}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">30 days</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{stats.totalCalls.month}</p>
        </div>
        <div className="rounded-lg border border-slate-200 p-4">
          <p className="text-sm text-slate-500">Errors (30d)</p>
          <p className={`mt-1 text-2xl font-bold ${stats.errors > 0 ? 'text-red-400' : 'text-slate-800'}`}>
            {stats.errors}
          </p>
        </div>
      </div>

      {/* Usage by user */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-slate-800">Usage by user (30d)</h3>
        {stats.byUser.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-base">
              <thead>
                <tr className="border-b border-slate-200 text-sm text-slate-400">
                  <th className="pb-2 pr-4 font-medium">User</th>
                  <th className="pb-2 pr-4 font-medium">MCP</th>
                  <th className="pb-2 font-medium">Calls</th>
                </tr>
              </thead>
              <tbody>
                {stats.byUser.map((row, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="py-2 pr-4 text-sm text-slate-800">{row.userName}</td>
                    <td className="py-2 pr-4">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        {row.mcpName}
                      </span>
                    </td>
                    <td className="py-2 text-sm font-medium text-slate-600">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Usage by tool */}
      <div>
        <h3 className="mb-3 text-base font-semibold text-slate-800">Most used tools (30d)</h3>
        {stats.byTool.length === 0 ? (
          <p className="text-sm text-slate-500">No data yet</p>
        ) : (
          <div className="space-y-2">
            {stats.byTool.map((tool) => (
              <div key={`${tool.mcpName}-${tool.toolName}`} className="flex items-center gap-3">
                <span className="w-14 shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-center text-[10px] font-medium text-slate-500">
                  {tool.mcpName}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-slate-600">
                  {tool.toolName}
                </span>
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-400"
                      style={{ width: `${(tool.count / maxToolCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-medium text-slate-500">
                    {tool.count}
                  </span>
                  <span className="w-14 shrink-0 text-right text-[10px] text-slate-500">
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
