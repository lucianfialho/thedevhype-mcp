'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface McpTool {
  name: string;
  description: string;
}

interface McpServer {
  name: string;
  description: string;
  icon: string | null;
  badge: string | null;
  tools: McpTool[];
}

interface ExistingAccess {
  mcpName: string;
  enabled: boolean;
  hasApiKey: boolean;
}

interface OnboardingWizardProps {
  servers: McpServer[];
  existingAccess: ExistingAccess[];
}

type ConfigTarget = 'claude-desktop' | 'claude-code' | 'cursor' | 'poke';

export function OnboardingWizard({ servers, existingAccess }: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(-1); // -1 = welcome screen

  // Only consider servers that exist in the registry
  const validServerNames = new Set(servers.map((s) => s.name));

  // Track which MCPs already have keys from the server
  const existingKeys = new Set(
    existingAccess.filter((a) => a.hasApiKey && validServerNames.has(a.mcpName)).map((a) => a.mcpName),
  );

  // Step 1: selected MCPs
  const [selected, setSelected] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    existingAccess.forEach((a) => {
      if (a.enabled && validServerNames.has(a.mcpName)) initial.add(a.mcpName);
    });
    return initial;
  });
  const [enabling, setEnabling] = useState<string | null>(null);

  // Step 2: API keys
  const [apiKeys, setApiKeys] = useState<Record<string, string>>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('onboarding_keys');
        if (stored) return JSON.parse(stored);
      } catch { /* ignore */ }
    }
    return {};
  });
  const [generating, setGenerating] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Step 3: config target
  const [configTarget, setConfigTarget] = useState<ConfigTarget>('poke');
  const [copiedConfig, setCopiedConfig] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  // Step 4: verification
  const [verifyStatus, setVerifyStatus] = useState<{
    connected: boolean;
    firstCallAt?: string;
    mcpName?: string;
    toolName?: string;
  }>({ connected: false });
  const [completing, setCompleting] = useState(false);

  // Persist keys to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem('onboarding_keys', JSON.stringify(apiKeys));
    } catch { /* ignore */ }
  }, [apiKeys]);

  // Step 1: toggle MCP selection
  async function handleToggleMcp(name: string) {
    setEnabling(name);
    const wasSelected = selected.has(name);

    try {
      if (wasSelected) {
        await fetch('/api/mcp-access', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mcpName: name }),
        });
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
      } else {
        await fetch('/api/mcp-access/enable', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mcpName: name }),
        });
        setSelected((prev) => new Set(prev).add(name));
      }
    } catch { /* revert silently */ }
    setEnabling(null);
  }

  // Step 2: generate key
  async function handleGenerateKey(name: string) {
    setGenerating(name);
    setKeyError(null);
    try {
      // Ensure the MCP is enabled first
      await fetch('/api/mcp-access/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpName: name }),
      });

      const res = await fetch('/api/mcp-access/generate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mcpName: name }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.apiKey) {
          setApiKeys((prev) => ({ ...prev, [name]: data.apiKey }));
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setKeyError(data.error || `Failed to generate key for ${name}`);
      }
    } catch {
      setKeyError(`Network error generating key for ${name}`);
    } finally {
      setGenerating(null);
    }
  }

  async function handleCopyKey(name: string) {
    const key = apiKeys[name];
    if (!key) return;
    await navigator.clipboard.writeText(key);
    setCopiedKey(name);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  // Step 3: build config per target
  function getSelectedMcps() {
    const entries: Array<{ name: string; url: string; key: string; isPlaceholder: boolean }> = [];
    for (const name of selected) {
      const key = apiKeys[name];
      entries.push({
        name,
        url: `https://www.thedevhype.com/api/mcp/${name}`,
        key: key || '<your-api-key>',
        isPlaceholder: !key,
      });
    }
    return entries;
  }

  const hasPlaceholderKeys = getSelectedMcps().some((m) => m.isPlaceholder);

  function buildConfig(): string {
    const mcps = getSelectedMcps();

    if (configTarget === 'claude-desktop') {
      const mcpServers: Record<string, { url: string; headers: { Authorization: string } }> = {};
      for (const m of mcps) {
        mcpServers[m.name] = {
          url: m.url,
          headers: { Authorization: `Bearer ${m.key}` },
        };
      }
      return JSON.stringify({ mcpServers }, null, 2);
    }

    if (configTarget === 'claude-code') {
      return mcps
        .map((m) => `claude mcp add ${m.name} \\\n  --transport http \\\n  --url "${m.url}" \\\n  --header "Authorization: Bearer ${m.key}"`)
        .join('\n\n');
    }

    if (configTarget === 'cursor') {
      const mcpServers: Record<string, { url: string; headers: { Authorization: string } }> = {};
      for (const m of mcps) {
        mcpServers[m.name] = {
          url: m.url,
          headers: { Authorization: `Bearer ${m.key}` },
        };
      }
      return JSON.stringify({ mcpServers }, null, 2);
    }

    return '';
  }

  async function handleCopyConfig() {
    const config = buildConfig();
    if (config) {
      await navigator.clipboard.writeText(config);
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    }
  }

  // Step 4: poll for verification
  const pollVerify = useCallback(async () => {
    try {
      const res = await fetch('/api/onboarding/verify');
      if (res.ok) {
        const data = await res.json();
        setVerifyStatus(data);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (step !== 3) return;
    pollVerify();
    const interval = setInterval(pollVerify, 3000);
    return () => clearInterval(interval);
  }, [step, pollVerify]);

  async function handleComplete() {
    setCompleting(true);
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      sessionStorage.removeItem('onboarding_keys');
      router.push('/dashboard');
    } catch {
      setCompleting(false);
    }
  }

  async function handleSkip() {
    setCompleting(true);
    try {
      await fetch('/api/onboarding/complete', { method: 'POST' });
      sessionStorage.removeItem('onboarding_keys');
      router.push('/dashboard');
    } catch {
      setCompleting(false);
    }
  }

  // Auto-complete when connected
  useEffect(() => {
    if (verifyStatus.connected && !completing) {
      fetch('/api/onboarding/complete', { method: 'POST' }).catch(() => {});
    }
  }, [verifyStatus.connected, completing]);

  const selectedServers = servers.filter((s) => selected.has(s.name));
  const allKeysGenerated = selectedServers.every((s) => !!apiKeys[s.name] || existingKeys.has(s.name));
  const allSelectedHaveExistingKeys = selectedServers.every((s) => existingKeys.has(s.name));

  /* ─── Render ─── */

  return (
    <div>
      {/* Welcome screen */}
      {step === -1 && (
        <div className="flex flex-col items-center py-2 text-center sm:py-6">
          <div className="flex -space-x-3">
            <img src="/eloa.png" alt="Eloa" className="h-16 w-16 rounded-full border-2 border-white shadow-sm dark:border-zinc-800" />
            <img src="/lucian.png" alt="Lucian" className="h-16 w-16 rounded-full border-2 border-white shadow-sm dark:border-zinc-800" />
          </div>

          <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-800 dark:text-zinc-100 sm:text-4xl">
            Your AI tools.
            <br />
            Let&apos;s set them up.
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-base text-slate-500 dark:text-zinc-400">
            Connect your MCP servers in under a minute.
            <br className="hidden sm:block" />
            Pick your tools, grab your keys, and you&apos;re live.
          </p>

          <button
            onClick={() => setStep(0)}
            className="mt-8 flex items-center gap-2.5 rounded-2xl bg-slate-800 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Get Started
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          </button>

          <div className="mt-8 flex items-center gap-5">
            {['Choose MCPs', 'Get API Keys', 'Connect & Go'].map((label, i) => (
              <div key={label} className="flex flex-col items-center">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200/60 text-xs font-semibold text-slate-400 dark:bg-zinc-700 dark:text-zinc-500">
                  {i + 1}
                </div>
                <span className="mt-1.5 text-xs text-slate-400 dark:text-zinc-500">{label}</span>
              </div>
            ))}
          </div>

          <button
            onClick={handleSkip}
            disabled={completing}
            className="mt-6 text-sm text-slate-400 transition-colors hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
          >
            {completing ? 'Redirecting...' : 'Skip setup'}
          </button>
        </div>
      )}

      {/* Step indicator — compact dots */}
      {step >= 0 && (
        <>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400 dark:text-zinc-500">
              Step {step + 1} of 4
            </span>
            <button
              onClick={handleSkip}
              disabled={completing}
              className="text-xs text-slate-400 transition-colors hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
            >
              {completing ? 'Redirecting...' : 'Skip'}
            </button>
          </div>
          <div className="mb-8 flex gap-1.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  i <= step
                    ? 'bg-slate-800 dark:bg-zinc-200'
                    : 'bg-slate-200 dark:bg-zinc-700'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {/* Step 1: Choose MCPs */}
      {step === 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 sm:text-2xl">Choose your MCP servers</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">Select which AI tools you want to connect.</p>

          <div className="mt-6 space-y-3">
            {servers.map((server) => {
              const isSelected = selected.has(server.name);
              const isEnabling = enabling === server.name;

              return (
                <button
                  key={server.name}
                  onClick={() => handleToggleMcp(server.name)}
                  disabled={isEnabling}
                  className={`w-full rounded-2xl border p-4 text-left transition-all sm:p-5 ${
                    isSelected
                      ? 'border-slate-800 bg-slate-800/5 dark:border-zinc-300 dark:bg-white/5'
                      : 'border-slate-200 hover:border-slate-300 dark:border-zinc-700 dark:hover:border-zinc-600'
                  } ${isEnabling ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-3.5">
                    {server.icon && (
                      <img src={server.icon} alt={server.name} className="h-11 w-11 shrink-0 rounded-full" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold capitalize text-slate-800 dark:text-zinc-100">{server.name}</h3>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {server.tools.length} tools
                        </span>
                        {server.badge && (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/50 dark:text-violet-300">
                            {server.badge}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-sm leading-snug text-slate-500 dark:text-zinc-400">{server.description}</p>
                    </div>
                    <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected
                        ? 'border-slate-800 bg-slate-800 dark:border-zinc-200 dark:bg-zinc-200'
                        : 'border-slate-300 dark:border-zinc-600'
                    }`}>
                      {isSelected && (
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white dark:text-zinc-900">
                          <path d="M2.5 6l2.5 2.5 4.5-4.5" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setStep(allSelectedHaveExistingKeys ? 2 : 1)}
            disabled={selected.size === 0}
            className="mt-6 w-full rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Generate API Keys */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 sm:text-2xl">Generate API Keys</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">Each server needs its own key. Copy them now — they&apos;re shown once.</p>

          {keyError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
              {keyError}
            </div>
          )}

          {/* Servers that already have keys */}
          {selectedServers.some((s) => existingKeys.has(s.name)) && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800/50 dark:bg-emerald-950/50">
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Already configured:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedServers.filter((s) => existingKeys.has(s.name)).map((s) => (
                  <span key={s.name} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-medium capitalize text-slate-700 dark:bg-zinc-800 dark:text-zinc-200">
                    {s.icon && <img src={s.icon} alt="" className="h-4 w-4 rounded-full" />}
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Servers that need keys */}
          <div className="mt-4 space-y-3">
            {selectedServers.filter((s) => !existingKeys.has(s.name)).map((server) => {
              const key = apiKeys[server.name];
              const isGenerating = generating === server.name;
              const isCopied = copiedKey === server.name;

              return (
                <div
                  key={server.name}
                  className="rounded-2xl border border-slate-200 p-4 sm:p-5 dark:border-zinc-700"
                >
                  <div className="flex items-center gap-3">
                    {server.icon && (
                      <img src={server.icon} alt={server.name} className="h-9 w-9 shrink-0 rounded-full" />
                    )}
                    <h3 className="text-base font-semibold capitalize text-slate-800 dark:text-zinc-100">{server.name}</h3>
                    {key && (
                      <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">
                        Ready
                      </span>
                    )}
                  </div>

                  {key ? (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 dark:border-amber-800/50 dark:bg-amber-950/50">
                      <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
                        Copy now — won&apos;t be shown again
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-700 dark:bg-zinc-900 dark:text-zinc-200">
                          {key}
                        </code>
                        <button
                          onClick={() => handleCopyKey(server.name)}
                          className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 dark:bg-zinc-200 dark:text-zinc-900 dark:hover:bg-zinc-300"
                        >
                          {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateKey(server.name)}
                      disabled={isGenerating}
                      className="mt-3 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-800 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Key'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 dark:border-zinc-700 dark:text-zinc-400"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!allKeysGenerated}
              className="flex-1 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Connection Config */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 sm:text-2xl">Connect to your AI client</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">Choose your client and follow the instructions.</p>

          {allSelectedHaveExistingKeys && hasPlaceholderKeys && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
              <p className="text-sm text-slate-600 dark:text-zinc-400">
                You already have API keys. Replace <code className="rounded bg-slate-200 px-1 text-xs dark:bg-zinc-700">&lt;your-api-key&gt;</code> with your existing key, or generate new ones:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {getSelectedMcps().filter((m) => m.isPlaceholder).map((m) => (
                  <button
                    key={m.name}
                    onClick={() => handleGenerateKey(m.name)}
                    disabled={generating === m.name}
                    className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-slate-300 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400"
                  >
                    {generating === m.name ? 'Generating...' : `Regenerate ${m.name} key`}
                  </button>
                ))}
              </div>
              {keyError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{keyError}</p>
              )}
            </div>
          )}

          {allSelectedHaveExistingKeys && !hasPlaceholderKeys && (
            <p className="mt-2 text-xs text-slate-400 dark:text-zinc-500">
              Using your freshly generated keys.
            </p>
          )}

          {/* Tab toggle */}
          <div className="mt-6 flex rounded-2xl border border-slate-200 p-1 dark:border-zinc-700">
            {([
              { key: 'poke' as const, label: 'Poke' },
              { key: 'claude-desktop' as const, label: 'Desktop' },
              { key: 'claude-code' as const, label: 'Code' },
              { key: 'cursor' as const, label: 'Cursor' },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setConfigTarget(tab.key)}
                className={`flex-1 rounded-xl px-2 py-2 text-sm font-medium transition-colors ${
                  configTarget === tab.key
                    ? 'bg-slate-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                    : 'text-slate-400 hover:text-slate-700 dark:text-zinc-500 dark:hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Instructions per target */}
          <div className="mt-3 rounded-2xl border border-slate-200 p-4 dark:border-zinc-700">
            {configTarget === 'claude-desktop' && (
              <div className="space-y-2 text-sm text-slate-600 dark:text-zinc-400">
                <p>1. Open Claude Desktop &rarr; <strong>Settings</strong> &rarr; <strong>Developer</strong></p>
                <p>2. Click <strong>&quot;Edit Config&quot;</strong> to open <code className="rounded bg-slate-100 px-1 text-xs dark:bg-zinc-800">claude_desktop_config.json</code></p>
                <p>3. Paste the JSON below and save</p>
                <p>4. Restart Claude Desktop</p>
              </div>
            )}
            {configTarget === 'claude-code' && (
              <div className="space-y-2 text-sm text-slate-600 dark:text-zinc-400">
                <p>1. Open your terminal</p>
                <p>2. Run the command{getSelectedMcps().length > 1 ? 's' : ''} below</p>
                <p>3. Claude Code will detect the new server{getSelectedMcps().length > 1 ? 's' : ''} automatically</p>
              </div>
            )}
            {configTarget === 'cursor' && (
              <div className="space-y-2 text-sm text-slate-600 dark:text-zinc-400">
                <p>1. Create <code className="rounded bg-slate-100 px-1 text-xs dark:bg-zinc-800">.cursor/mcp.json</code> in your project root</p>
                <p>2. Paste the JSON below and save</p>
                <p>3. Restart Cursor or reload the window</p>
              </div>
            )}
            {configTarget === 'poke' && (
              <div className="space-y-2 text-sm text-slate-600 dark:text-zinc-400">
                <p>1. Open <strong>poke.com</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Connections</strong></p>
                <p>2. Click <strong>&quot;Add Integration&quot;</strong> &rarr; <strong>&quot;Create&quot;</strong></p>
                <p>3. For each MCP server, fill in:</p>
                {getSelectedMcps().map((m) => (
                  <div key={m.name} className="mt-2 rounded-xl bg-slate-100/80 p-3 dark:bg-zinc-800/50">
                    <span className="text-xs font-semibold capitalize text-slate-700 dark:text-zinc-300">{m.name}</span>
                    <div className="mt-1.5 space-y-1 text-xs">
                      <div><span className="text-slate-400 dark:text-zinc-500">Name:</span> <code className="rounded bg-white px-1 dark:bg-zinc-800">{m.name}</code></div>
                      <div><span className="text-slate-400 dark:text-zinc-500">URL:</span> <code className="rounded bg-white px-1 dark:bg-zinc-800 break-all">{m.url}</code></div>
                      <div><span className="text-slate-400 dark:text-zinc-500">Key:</span> <code className="rounded bg-white px-1 dark:bg-zinc-800 break-all">{m.key}</code></div>
                    </div>
                  </div>
                ))}
                <p className="mt-2">4. Click <strong>&quot;Create Integration&quot;</strong> for each</p>
              </div>
            )}
          </div>

          {/* Config block (not for Poke) */}
          {configTarget !== 'poke' && (
            <div className="mt-3">
              <div className="relative">
                <pre className="overflow-x-auto rounded-2xl border border-slate-200 bg-slate-100 p-4 text-xs leading-relaxed text-slate-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {buildConfig()}
                </pre>
                <button
                  onClick={handleCopyConfig}
                  className="absolute right-2.5 top-2.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  {copiedConfig ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {configTarget === 'claude-code' && (
                <p className="mt-1.5 text-xs text-slate-400 dark:text-zinc-500">Run in your terminal. One command per MCP server.</p>
              )}
              {configTarget === 'cursor' && (
                <p className="mt-1.5 text-xs text-slate-400 dark:text-zinc-500">Save as <code className="rounded bg-slate-100 px-1 dark:bg-zinc-800">.cursor/mcp.json</code> in your project root.</p>
              )}
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(allSelectedHaveExistingKeys ? 0 : 1)}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 dark:border-zinc-700 dark:text-zinc-400"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Verify Connection */}
      {step === 3 && (
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100 sm:text-2xl">Verify connection</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
            Make any MCP tool call from your AI client to confirm it works.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-slate-200 p-8 dark:border-zinc-700">
            {verifyStatus.connected ? (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50">
                  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-600 dark:text-emerald-400">
                    <path d="M8 16l6 6 10-10" />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-emerald-700 dark:text-emerald-400">Connected!</h3>
                <p className="mt-1.5 text-sm text-slate-500 dark:text-zinc-400">
                  First call: <strong>{verifyStatus.toolName}</strong> on <strong>{verifyStatus.mcpName}</strong>
                </p>
                {verifyStatus.firstCallAt && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-zinc-500">
                    {new Date(verifyStatus.firstCallAt).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-800">
                  <span className="relative flex h-4 w-4">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-slate-400 opacity-75" />
                    <span className="relative inline-flex h-4 w-4 rounded-full bg-slate-500" />
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-800 dark:text-zinc-100">Waiting for your first call...</h3>
                <p className="mt-1.5 text-center text-sm text-slate-500 dark:text-zinc-400">
                  Open your AI client and try a tool.
                </p>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {verifyStatus.connected ? (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full rounded-2xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
              >
                {completing ? 'Redirecting...' : 'Go to Dashboard'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setStep(2)}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 dark:border-zinc-700 dark:text-zinc-400"
                >
                  Back
                </button>
                <button
                  onClick={handleSkip}
                  disabled={completing}
                  className="text-sm text-slate-400 transition-colors hover:text-slate-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                >
                  {completing ? 'Redirecting...' : "Skip — I'll test later"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
