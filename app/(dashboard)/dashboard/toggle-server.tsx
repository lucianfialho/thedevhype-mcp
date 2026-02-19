'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { generateApiKey } from '@/app/lib/actions/generate-key';

export function ToggleServer({
  mcpName,
  enabled: initialEnabled,
  hasApiKey: initialHasApiKey,
}: {
  mcpName: string;
  enabled: boolean;
  hasApiKey: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, setIsPending] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey);
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
      router.refresh();
    } catch {
      setEnabled(prev);
    } finally {
      setIsPending(false);
    }
  }

  async function handleGenerateKey() {
    setIsGenerating(true);
    setNewApiKey(null);

    try {
      const result = await generateApiKey(mcpName);
      if (result.apiKey) {
        setNewApiKey(result.apiKey);
        setHasApiKey(true);
      }
      router.refresh();
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopyKey() {
    if (!newApiKey) return;
    await navigator.clipboard.writeText(newApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-3">
      {/* Toggle row */}
      <div className="flex items-center gap-3">
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
        <span className="text-xs text-zinc-500">
          {enabled ? 'Habilitado' : 'Desabilitado'}
        </span>
      </div>

      {/* Generate key - only when enabled */}
      {enabled && !newApiKey && (
        <button
          onClick={handleGenerateKey}
          disabled={isGenerating}
          className="rounded border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:text-zinc-100"
        >
          {isGenerating
            ? 'Gerando...'
            : hasApiKey
              ? 'Regenerar API Key'
              : 'Gerar API Key'}
        </button>
      )}

      {/* New key banner */}
      {newApiKey && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
          <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
            API key gerada — copie agora, ela nao sera exibida novamente.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 truncate rounded bg-white px-2 py-1 text-xs text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {newApiKey}
            </code>
            <button
              onClick={handleCopyKey}
              className="shrink-0 rounded bg-zinc-900 px-3 py-1 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
