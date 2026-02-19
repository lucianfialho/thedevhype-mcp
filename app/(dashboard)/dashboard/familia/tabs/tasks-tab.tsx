'use client';

import { useState } from 'react';
import { addTask, updateTaskStatus, deleteTask } from '../actions';

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

const STATUS_LABELS: Record<string, string> = {
  pending: 'pendente',
  in_progress: 'em progresso',
  done: 'concluída',
};

const NEXT_STATUS: Record<string, string> = {
  pending: 'in_progress',
  in_progress: 'done',
  done: 'pending',
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

interface MemberInfo {
  userId: string;
  role: string;
  nickname: string | null;
  name: string | null;
}

interface TasksTabProps {
  tasks: TaskInfo[];
  familyId: number;
  members: MemberInfo[];
  onTasksChange: (tasks: TaskInfo[]) => void;
}

export function TasksTab({ tasks, familyId, members, onTasksChange }: TasksTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError('');
    const res = await addTask(
      familyId,
      title.trim(),
      description.trim() || undefined,
      assignedTo || undefined,
      priority,
      dueDate || undefined,
    );
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      const assignee = members.find((m) => m.userId === assignedTo);
      const newTask: TaskInfo = {
        id: res.data.id,
        title: res.data.title,
        description: res.data.description,
        status: res.data.status,
        priority: res.data.priority,
        dueDate: res.data.dueDate,
        assignedToName: assignee?.name || null,
        assignedToNickname: assignee?.nickname || null,
        createdAt: res.data.createdAt,
        updatedAt: res.data.updatedAt,
      };
      onTasksChange([newTask, ...tasks]);
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setPriority('medium');
      setDueDate('');
      setShowForm(false);
    }
    setSubmitting(false);
  }

  function handleCycleStatus(task: TaskInfo) {
    const next = NEXT_STATUS[task.status] || 'pending';
    // Optimistic update
    const updated = tasks.map((t) =>
      t.id === task.id ? { ...t, status: next } : t,
    );
    onTasksChange(updated);
    // Fire and forget
    updateTaskStatus(familyId, task.id, next);
  }

  function handleDelete(task: TaskInfo) {
    // Optimistic removal
    onTasksChange(tasks.filter((t) => t.id !== task.id));
    // Fire and forget
    deleteTask(familyId, task.id);
  }

  const active = tasks.filter((t) => t.status !== 'done');
  const done = tasks.filter((t) => t.status === 'done');

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Tarefas</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-200"
        >
          {showForm ? 'Cancelar' : '+ Nova tarefa'}
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-2xl border border-slate-200 p-4">
          <input
            type="text"
            placeholder="Título da tarefa"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            required
            autoFocus
          />
          <textarea
            placeholder="Descrição (opcional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500"
            rows={2}
          />
          <div className="flex gap-2">
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="flex-1 rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="">Sem responsável</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.nickname || m.name || m.userId}
                </option>
              ))}
            </select>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-32 rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
            </select>
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-xl border-0 bg-slate-100 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="w-full rounded-xl bg-slate-800 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
          >
            {submitting ? 'Criando...' : 'Criar tarefa'}
          </button>
        </form>
      )}

      {tasks.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
          <p className="text-base text-slate-400">Nenhuma tarefa ainda.</p>
          <p className="mt-1 text-sm text-slate-500">
            Clique em &quot;+ Nova tarefa&quot; para começar.
          </p>
        </div>
      )}

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
                      {task.priority === 'high' ? 'alta' : task.priority === 'medium' ? 'média' : 'baixa'}
                    </span>
                  )}
                  <button
                    onClick={() => handleCycleStatus(task)}
                    className={`rounded-full px-2 py-0.5 text-sm font-medium transition-colors hover:opacity-80 ${STATUS_COLORS[task.status] || STATUS_COLORS.pending}`}
                    title="Clique para mudar o status"
                  >
                    {STATUS_LABELS[task.status] || task.status}
                  </button>
                </div>
              </div>
              {task.description && (
                <p className="mt-1 text-sm text-slate-500 line-clamp-2">{task.description}</p>
              )}
              <div className="mt-2 flex items-center gap-3 text-sm text-slate-400">
                {(task.assignedToNickname || task.assignedToName) && (
                  <span>{task.assignedToNickname || task.assignedToName}</span>
                )}
                {task.dueDate && <span>Prazo: {task.dueDate}</span>}
                <button
                  onClick={() => handleDelete(task)}
                  className="ml-auto text-slate-400 transition-colors hover:text-red-500"
                  title="Excluir tarefa"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {done.length > 0 && (
        <>
          <h4 className="mb-2 mt-6 text-sm font-medium text-slate-500">Concluídas ({done.length})</h4>
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
                  <p className="min-w-0 flex-1 text-base text-slate-500 line-through">{task.title}</p>
                  <button
                    onClick={() => handleCycleStatus(task)}
                    className="shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-sm font-medium text-green-700 transition-colors hover:opacity-80"
                    title="Clique para reabrir"
                  >
                    concluída
                  </button>
                  <button
                    onClick={() => handleDelete(task)}
                    className="shrink-0 text-slate-400 transition-colors hover:text-red-500"
                    title="Excluir tarefa"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
