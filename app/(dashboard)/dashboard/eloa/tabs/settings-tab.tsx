'use client';

import { useState } from 'react';

interface McpTool {
  name: string;
  description: string;
}

const BRAZILIAN_STATES = [
  { uf: 'AC', name: 'Acre' }, { uf: 'AL', name: 'Alagoas' }, { uf: 'AP', name: 'Amapa' },
  { uf: 'AM', name: 'Amazonas' }, { uf: 'BA', name: 'Bahia' }, { uf: 'CE', name: 'Ceara' },
  { uf: 'DF', name: 'Distrito Federal' }, { uf: 'ES', name: 'Espirito Santo' },
  { uf: 'GO', name: 'Goias' }, { uf: 'MA', name: 'Maranhao' }, { uf: 'MT', name: 'Mato Grosso' },
  { uf: 'MS', name: 'Mato Grosso do Sul' }, { uf: 'MG', name: 'Minas Gerais' },
  { uf: 'PA', name: 'Para' }, { uf: 'PB', name: 'Paraiba' }, { uf: 'PR', name: 'Parana' },
  { uf: 'PE', name: 'Pernambuco' }, { uf: 'PI', name: 'Piaui' },
  { uf: 'RJ', name: 'Rio de Janeiro' }, { uf: 'RN', name: 'Rio Grande do Norte' },
  { uf: 'RS', name: 'Rio Grande do Sul' }, { uf: 'RO', name: 'Rondonia' },
  { uf: 'RR', name: 'Roraima' }, { uf: 'SC', name: 'Santa Catarina' },
  { uf: 'SP', name: 'Sao Paulo' }, { uf: 'SE', name: 'Sergipe' },
  { uf: 'TO', name: 'Tocantins' },
];

interface SettingsTabProps {
  mcpName: string;
  mcpUrl: string;
  tools: McpTool[];
  initialEnabled: boolean;
  initialHasApiKey: boolean;
  maskedApiKey: string | null;
  showContributeToggle?: boolean;
  initialContribute?: boolean;
  onContributeChange?: (value: boolean) => void;
  showDefaultState?: boolean;
  initialDefaultState?: string | null;
  publicApiKey?: string | null;
}

export function SettingsTab({
  mcpName,
  mcpUrl,
  tools,
  initialEnabled,
  initialHasApiKey,
  maskedApiKey,
  showContributeToggle = false,
  initialContribute = false,
  onContributeChange,
  showDefaultState = false,
  initialDefaultState = null,
  publicApiKey = null,
}: SettingsTabProps) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [isPending, setIsPending] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [contribute, setContribute] = useState(initialContribute);
  const [contributePending, setContributePending] = useState(false);
  const [defaultState, setDefaultState] = useState(initialDefaultState ?? '');
  const [statePending, setStatePending] = useState(false);

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

  async function handleContributeToggle() {
    setContributePending(true);
    const prev = contribute;
    setContribute(!prev);

    try {
      const res = await fetch('/api/mcp-access/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpName }),
      });

      if (!res.ok) {
        setContribute(prev);
        return;
      }

      const data = await res.json();
      setContribute(data.contributePublicData);
      onContributeChange?.(data.contributePublicData);
    } catch {
      setContribute(prev);
    } finally {
      setContributePending(false);
    }
  }

  async function handleDefaultStateChange(uf: string) {
    if (!publicApiKey) return;
    setStatePending(true);
    const prev = defaultState;
    setDefaultState(uf);

    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': publicApiKey,
        },
        body: JSON.stringify({ default_state: uf || null }),
      });

      if (!res.ok) {
        setDefaultState(prev);
      }
    } catch {
      setDefaultState(prev);
    } finally {
      setStatePending(false);
    }
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

      {/* Contribute public data toggle */}
      {showContributeToggle && enabled && (
        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Contribuir dados para API publica
              </h3>
              <p className="mt-0.5 text-xs text-zinc-400">
                Seus precos serao anonimizados e disponibilizados na API publica de precos de supermercado.
              </p>
            </div>
            <button
              onClick={handleContributeToggle}
              disabled={contributePending}
              role="switch"
              aria-checked={contribute}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                contribute ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform dark:bg-zinc-900 ${
                  contribute ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </section>
      )}

      {/* Default state for API */}
      {showDefaultState && enabled && publicApiKey && (
        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Estado padrao da API
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Filtra automaticamente resultados por estado quando nenhum &quot;state&quot; for enviado na query.
            </p>
          </div>
          <div className="mt-3">
            <select
              value={defaultState}
              onChange={(e) => handleDefaultStateChange(e.target.value)}
              disabled={statePending}
              className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 transition-colors focus:border-zinc-400 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:focus:border-zinc-500"
            >
              <option value="">Todos (sem filtro)</option>
              {BRAZILIAN_STATES.map((s) => (
                <option key={s.uf} value={s.uf}>
                  {s.uf} — {s.name}
                </option>
              ))}
            </select>
          </div>
        </section>
      )}
    </div>
  );
}
