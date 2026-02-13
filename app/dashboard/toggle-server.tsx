'use client';

import { useTransition, useOptimistic } from 'react';
import { toggleMcpAccess } from './actions';

export function ToggleServer({
  mcpName,
  enabled,
}: {
  mcpName: string;
  enabled: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticEnabled, setOptimisticEnabled] = useOptimistic(enabled);

  function handleToggle() {
    startTransition(async () => {
      setOptimisticEnabled(!optimisticEnabled);
      await toggleMcpAccess(mcpName);
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      role="switch"
      aria-checked={optimisticEnabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        optimisticEnabled ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform dark:bg-zinc-900 ${
          optimisticEnabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
