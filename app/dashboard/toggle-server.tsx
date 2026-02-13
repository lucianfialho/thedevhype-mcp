'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function ToggleServer({
  mcpName,
  enabled: initialEnabled,
}: {
  mcpName: string;
  enabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setIsPending(true);
    const prev = enabled;
    setEnabled(!prev);

    try {
      const res = await fetch('/api/mcp-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpName }),
      });

      if (!res.ok) {
        setEnabled(prev);
        return;
      }

      const data = await res.json();
      setEnabled(data.enabled);
      router.refresh();
    } catch {
      setEnabled(prev);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      role="switch"
      aria-checked={enabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        enabled ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform dark:bg-zinc-900 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
