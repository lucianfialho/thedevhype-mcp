'use client';

import { useState } from 'react';
import { TabSelect } from '../../components/ui';

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

const STATE_OPTIONS = [
  { id: '', label: 'All (no filter)' },
  ...BRAZILIAN_STATES.map((s) => ({ id: s.uf, label: `${s.uf} — ${s.name}` })),
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
  const [confirmedEnabled, setConfirmedEnabled] = useState(initialEnabled);
  const [isPending, setIsPending] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(initialHasApiKey);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [contribute, setContribute] = useState(initialContribute);
  const [contributePending, setContributePending] = useState(false);
  const [defaultState, setDefaultState] = useState(initialDefaultState ?? '');
  const [statePending, setStatePending] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);

  async function handleToggle() {
    if (isPending) return;
    setIsPending(true);
    const prev = enabled;
    const desired = !prev;
    setEnabled(desired);

    try {
      const res = await fetch('/api/mcp-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpName, enabled: desired }),
      });

      if (!res.ok) {
        setEnabled(prev);
        setConfirmedEnabled(prev);
        return;
      }

      const data = await res.json();
      setEnabled(data.enabled);
      setConfirmedEnabled(data.enabled);
    } catch {
      setEnabled(prev);
      setConfirmedEnabled(prev);
    } finally {
      setIsPending(false);
    }
  }

  async function handleGenerateKey() {
    if (isPending) return;
    setIsGenerating(true);
    setNewApiKey(null);
    setGenerateError(null);

    try {
      // If not yet confirmed enabled by backend, enable first
      if (!confirmedEnabled) {
        const enableRes = await fetch('/api/mcp-access/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mcpName }),
        });
        if (!enableRes.ok) {
          setGenerateError('Failed to enable server. Try again.');
          return;
        }
        setConfirmedEnabled(true);
      }

      const res = await fetch('/api/mcp-access/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpName }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setGenerateError(data.error || 'Failed to generate key. Try again.');
        return;
      }

      const data = await res.json();
      if (data.apiKey) {
        setNewApiKey(data.apiKey);
        setHasApiKey(true);
      }
    } catch {
      setGenerateError('Network error. Try again.');
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
    <div className="space-y-4">
      {/* MCP Server toggle */}
      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
              <path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-slate-800">MCP Server</p>
            <p className="text-sm text-slate-500">Claude, Cursor, and other clients</p>
          </div>
          <button
            onClick={handleToggle}
            disabled={isPending}
            role="switch"
            aria-checked={enabled}
            className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
              enabled ? 'bg-slate-800' : 'bg-slate-200'
            }`}
          >
            <span
              className={`pointer-events-none block h-[22px] w-[22px] rounded-full bg-white shadow-lg ring-0 transition-transform ${
                enabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {(enabled || confirmedEnabled) && (
        <>
          {/* Endpoint */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                  <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                  <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500">Endpoint</p>
                <p className="mt-0.5 truncate text-sm text-slate-600">{mcpUrl}</p>
              </div>
              <button
                onClick={handleCopyUrl}
                className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-200"
              >
                {copiedUrl ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          {/* API Key */}
          <div className="rounded-2xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                  <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 11-7.778 7.778 5.5 5.5 0 017.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-500">API Key</p>
                {maskedApiKey && !newApiKey && (
                  <p className="mt-0.5 font-mono text-sm text-slate-600">{maskedApiKey}</p>
                )}
                {!maskedApiKey && !newApiKey && (
                  <p className="mt-0.5 text-sm text-slate-500">No key generated yet</p>
                )}
              </div>
              {!newApiKey && (
                <button
                  onClick={handleGenerateKey}
                  disabled={isGenerating || isPending}
                  className="shrink-0 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-200 disabled:opacity-50"
                >
                  {isGenerating ? '...' : hasApiKey ? 'Regenerate' : 'Generate'}
                </button>
              )}
            </div>

            {newApiKey && (
              <div className="mt-3 rounded-xl bg-amber-50 p-3">
                <div className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#d97706" strokeWidth="1.5">
                    <path d="M8 1l1.5 3 3.5.5-2.5 2.5.5 3.5L8 9l-3 1.5.5-3.5L3 4.5 6.5 4z" />
                  </svg>
                  <p className="text-sm font-medium text-amber-700">
                    Copy now — won't be shown again
                  </p>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-3 py-2 font-mono text-sm text-slate-700">
                    {newApiKey}
                  </code>
                  <button
                    onClick={handleCopyKey}
                    className="shrink-0 rounded-xl bg-slate-800 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            {generateError && (
              <div className="mt-2 rounded-xl bg-red-50 px-3 py-2">
                <p className="text-sm text-red-600">{generateError}</p>
              </div>
            )}

            <p className="mt-2 text-sm text-slate-500">
              Use as Bearer token in the Authorization header.
            </p>
          </div>

          {/* Tools accordion */}
          {tools.length > 0 && (
            <div className="rounded-2xl border border-slate-200">
              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className="flex w-full items-center gap-3 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-base font-medium text-slate-800">Available tools</p>
                  <p className="text-sm text-slate-500">{tools.length} tools</p>
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className={`shrink-0 text-slate-500 transition-transform ${toolsOpen ? 'rotate-180' : ''}`}
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </button>
              {toolsOpen && (
                <div className="border-t border-slate-200 px-4 py-2">
                  {tools.map((tool) => (
                    <div
                      key={tool.name}
                      className="rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <span className="font-mono text-sm font-medium text-slate-800">
                        {tool.name}
                      </span>
                      <p className="mt-0.5 text-sm text-slate-500">{tool.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Contribute public data */}
          {showContributeToggle && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-slate-800">Contribute data</p>
                  <p className="text-sm text-slate-500">Anonymized prices for the public API</p>
                </div>
                <button
                  onClick={handleContributeToggle}
                  disabled={contributePending}
                  role="switch"
                  aria-checked={contribute}
                  className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${
                    contribute ? 'bg-slate-800' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none block h-[22px] w-[22px] rounded-full bg-white shadow-lg ring-0 transition-transform ${
                      contribute ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          )}

          {/* Default state */}
          {showDefaultState && publicApiKey && (
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-medium text-slate-800">Default state</p>
                  <p className="text-sm text-slate-500">Auto-filter API results by state</p>
                </div>
              </div>
              <div className="mt-3">
                <TabSelect
                  options={STATE_OPTIONS}
                  value={defaultState}
                  onChange={(id) => handleDefaultStateChange(id)}
                  fullWidth
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Disabled state */}
      {!enabled && !confirmedEnabled && (
        <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-slate-400">
            <path d="M12 2v4m0 12v4M2 12h4m12 0h4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83" />
          </svg>
          <p className="text-base text-slate-400">MCP Server disabled</p>
          <p className="mt-1 text-sm text-slate-500">Enable above to configure</p>
        </div>
      )}
    </div>
  );
}
