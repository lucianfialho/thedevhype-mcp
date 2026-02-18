'use client';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-600',
  in_progress: 'bg-blue-100 text-blue-700',
  done: 'bg-green-100 text-green-700',
};

interface TaskInfo {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  assignedToName: string | null;
  assignedToNickname: string | null;
  createdAt: string;
  updatedAt: string;
}

interface TasksTabProps {
  tasks: TaskInfo[];
}

export function TasksTab({ tasks }: TasksTabProps) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
        <p className="text-base text-slate-400">No tasks yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Use <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">create_task</code> via MCP.
        </p>
      </div>
    );
  }

  const active = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <div>
      <h3 className="mb-4 text-lg font-semibold text-slate-800">Tasks</h3>

      {active.length > 0 && (
        <div className="space-y-2">
          {active.map((task) => (
            <div
              key={task.id}
              className="rounded-2xl border border-slate-200 p-4 transition-colors hover:border-slate-300"
            >
              <div className="flex items-start gap-2">
                <h4 className="min-w-0 flex-1 text-base font-medium text-slate-800">
                  {task.title}
                </h4>
                <div className="flex shrink-0 gap-1.5">
                  {task.priority && (
                    <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                      {task.priority}
                    </span>
                  )}
                  <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${STATUS_COLORS[task.status] || STATUS_COLORS.pending}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
              {task.description && (
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{task.description}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-sm text-slate-400">
                {(task.assignedToNickname || task.assignedToName) && (
                  <span>{task.assignedToNickname || task.assignedToName}</span>
                )}
                {task.dueDate && <span>Due: {task.dueDate}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h4 className="mb-2 mt-6 text-sm font-medium text-slate-500">Completed ({done.length})</h4>
          <div className="space-y-2">
            {done.map((task) => (
              <div
                key={task.id}
                className="rounded-2xl border border-slate-100 bg-slate-50 p-4 opacity-60"
              >
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-green-500">
                    <path d="M3 8l4 4 6-6" />
                  </svg>
                  <p className="text-base text-slate-500 line-through">{task.title}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
