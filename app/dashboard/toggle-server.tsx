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
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setIsPending(true);
    setNewApiKey(null);
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

      if (data.enabled && data.apiKey) {
        setNewApiKey(data.apiKey);
      }

      router.refresh();
    } catch {
      setEnabled(prev);
    } finally {
      setIsPending(false);
    }
  }

  async function handleCopyKey() {
    if (!newApiKey) return;
    await navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
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

      {newApiKey && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            API key generated — copy it now, it won&apos;t be shown again.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {newApiKey}
            </code>
            <button
              onClick={handleCopyKey}
              className="shrink-0 rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
