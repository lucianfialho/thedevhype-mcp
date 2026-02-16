'use client';

import { useState } from 'react';

interface McpTool {
  name: string;
  description: string;
}

interface SettingsTabProps {
  mcpName: string;
  mcpUrl: string;
  tools: McpTool[];
  initialEnabled: boolean;
  initialHasApiKey: boolean;
  maskedApiKey: string | null;
}

export function SettingsTab({
  mcpName,
  mcpUrl,
  tools,
  initialEnabled,
  initialHasApiKey,
  maskedApiKey,
}: SettingsTabProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, setIsPending] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

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
      const res = await fetch('/api/mcp-access/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpName }),
      });

      if (!res.ok) return;

      const data = await res.json();
      if (data.apiKey) {
        setNewApiKey(data.apiKey);
        setHasApiKey(true);
      }
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

  async function handleCopyUrl() {
    await navigator.clipboard.writeText(mcpUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* MCP Server toggle */}
      <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              MCP Server
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Acesso via Claude, Cursor e outros clientes MCP
            </p>
          </div>
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
        </div>

        {enabled && (
          <div className="mt-5 space-y-4 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            {/* Endpoint */}
            <div>
              <span className="text-xs font-medium text-zinc-500">Endpoint</span>
              <div className="mt-1 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {mcpUrl}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className="shrink-0 rounded border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                >
                  {copiedUrl ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            </div>

            {/* API Key */}
            <div>
              <span className="text-xs font-medium text-zinc-500">API Key</span>
              {newApiKey ? (
                <div className="mt-1 rounded-md border border-amber-300 bg-amber-50 p-3 dark:border-amber-700 dark:bg-amber-950">
                  <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                    Copie agora — ela nao sera exibida novamente.
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
              ) : maskedApiKey ? (
                <div className="mt-1 flex items-center gap-2">
                  <code className="flex-1 rounded bg-zinc-100 px-3 py-2 text-xs text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {maskedApiKey}
                  </code>
                  <button
                    onClick={handleGenerateKey}
                    disabled={isGenerating}
                    className="shrink-0 rounded border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                  >
                    {isGenerating ? 'Gerando...' : 'Regenerar'}
                  </button>
                </div>
              ) : (
                <div className="mt-1">
                  <button
                    onClick={handleGenerateKey}
                    disabled={isGenerating}
                    className="rounded border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                  >
                    {isGenerating ? 'Gerando...' : 'Gerar API Key'}
                  </button>
                </div>
              )}
              <p className="mt-1 text-xs text-zinc-400">
                Use como Bearer token no header Authorization.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Tools list */}
      {enabled && tools.length > 0 && (
        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h3 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Tools disponiveis ({tools.length})
          </h3>
          <div className="space-y-2">
            {tools.map((tool) => (
              <div key={tool.name} className="flex items-start gap-2 text-xs">
                <code className="shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                  {tool.name}
                </code>
                <span className="text-zinc-500">{tool.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
