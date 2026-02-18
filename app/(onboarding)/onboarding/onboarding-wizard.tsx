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

const STEPS = [
  { label: 'Choose MCPs', short: 'MCPs' },
  { label: 'API Keys', short: 'Keys' },
  { label: 'Connect', short: 'Config' },
  { label: 'Verify', short: 'Verify' },
] as const;

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
        // Deselect: toggle off via existing endpoint
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
        // Select: enable via idempotent endpoint
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
    try {
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
      }
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
  // Returns all selected MCPs with key or placeholder
  function getSelectedMcps() {
    const entries: Array<{ name: string; url: string; key: string; isPlaceholder: boolean }> = [];
    for (const name of selected) {
      const key = apiKeys[name];
      entries.push({
        name,
        url: `https://www.thedevhype.com/api/mcp/${name}/mcp`,
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

    // poke: no JSON, instructions only
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

  // Check if all selected MCPs already have keys (no need for step 1)
  const allSelectedHaveExistingKeys = selectedServers.every((s) => existingKeys.has(s.name));

  return (
    <div>
      {/* Skip link */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={handleSkip}
          disabled={completing}
          className="text-sm text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          {completing ? 'Redirecting...' : 'Skip setup'}
        </button>
      </div>

      {/* Welcome screen */}
      {step === -1 && (
        <div className="flex flex-col items-center pt-8 text-center sm:pt-16">
          <div className="flex -space-x-4">
            <img src="/eloa.png" alt="Eloa" className="h-20 w-20 rounded-full border-3 border-white dark:border-zinc-900" />
            <img src="/lucian.png" alt="Lucian" className="h-20 w-20 rounded-full border-3 border-white dark:border-zinc-900" />
          </div>

          <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl">
            Your AI tools.
            <br />
            Let&apos;s set them up.
          </h1>

          <p className="mx-auto mt-6 max-w-md text-lg text-zinc-500">
            Connect your MCP servers in under a minute.
            <br className="hidden sm:block" />
            Pick your tools, grab your keys, and you&apos;re live.
          </p>

          <div className="mt-12 flex flex-col items-center gap-4">
            <button
              onClick={() => setStep(0)}
              className="cursor-pointer flex items-center gap-2.5 rounded-lg bg-zinc-900 px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Get Started
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>

            <div className="mt-4 grid grid-cols-3 gap-6 text-center">
              {[
                { step: '1', label: 'Choose MCPs' },
                { step: '2', label: 'Get API Keys' },
                { step: '3', label: 'Connect & Go' },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 text-xs font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    {item.step}
                  </div>
                  <span className="mt-2 text-xs text-zinc-400">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step indicator (hidden on welcome screen) */}
      {step >= 0 && (
        <div className="mb-10 flex items-center justify-center gap-1.5 sm:gap-3">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1.5 sm:gap-3">
              <button
                onClick={() => {
                  if (i < step) setStep(i);
                }}
                disabled={i > step}
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  i < step
                    ? 'bg-zinc-900 text-white cursor-pointer dark:bg-zinc-100 dark:text-zinc-900'
                    : i === step
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'
                }`}
              >
                {i < step ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 7l3 3 5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </button>
              <span className={`hidden text-sm sm:block ${i <= step ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}`}>
                {s.short}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`h-px w-8 sm:w-12 ${i < step ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Choose MCPs */}
      {step === 0 && (
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Choose your MCP servers</h2>
          <p className="mt-2 text-base text-zinc-500">Select which AI tools you want to connect. You can change this later.</p>

          <div className="mt-8 space-y-3">
            {servers.map((server) => {
              const isSelected = selected.has(server.name);
              const isEnabling = enabling === server.name;

              return (
                <button
                  key={server.name}
                  onClick={() => handleToggleMcp(server.name)}
                  disabled={isEnabling}
                  className={`w-full cursor-pointer rounded-lg border p-5 text-left transition-all sm:p-6 ${
                    isSelected
                      ? 'border-zinc-900 bg-zinc-50 dark:border-zinc-100 dark:bg-zinc-900'
                      : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                  } ${isEnabling ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    {server.icon && (
                      <img src={server.icon} alt={server.name} className="h-12 w-12 shrink-0 rounded-full" />
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold capitalize">{server.name}</h3>
                        <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                          {server.tools.length} tools
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">{server.description}</p>
                    </div>
                    <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                      isSelected
                        ? 'border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100'
                        : 'border-zinc-300 dark:border-zinc-600'
                    }`}>
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#18181b' : 'white'} strokeWidth="2">
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
            className="mt-8 w-full rounded-lg bg-zinc-900 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Generate API Keys */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Generate API Keys</h2>
          <p className="mt-2 text-base text-zinc-500">Each MCP server needs its own API key. Keys are shown once — copy them now.</p>

          <div className="mt-8 space-y-4">
            {selectedServers.map((server) => {
              const key = apiKeys[server.name];
              const isGenerating = generating === server.name;
              const isCopied = copiedKey === server.name;

              return (
                <div
                  key={server.name}
                  className="rounded-lg border border-zinc-200 p-5 sm:p-6 dark:border-zinc-800"
                >
                  <div className="flex items-center gap-3">
                    {server.icon && (
                      <img src={server.icon} alt={server.name} className="h-10 w-10 shrink-0 rounded-full" />
                    )}
                    <h3 className="text-lg font-semibold capitalize">{server.name}</h3>
                    {key && (
                      <span className="ml-auto rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        Ready
                      </span>
                    )}
                  </div>

                  {key ? (
                    <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-950">
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Copy now — this key won't be shown again.
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <code className="flex-1 truncate rounded bg-white px-3 py-1.5 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                          {key}
                        </code>
                        <button
                          onClick={() => handleCopyKey(server.name)}
                          className="shrink-0 rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                        >
                          {isCopied ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateKey(server.name)}
                      disabled={isGenerating}
                      className="mt-4 rounded-lg border border-zinc-200 px-5 py-2.5 text-base text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                    >
                      {isGenerating ? 'Generating...' : 'Generate Key'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="rounded-lg border border-zinc-200 px-5 py-3.5 text-base font-medium text-zinc-600 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={!allKeysGenerated}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Connection Config */}
      {step === 2 && (
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Connect to your AI client</h2>
          <p className="mt-2 text-base text-zinc-500">Choose your client and follow the instructions below.</p>

          {allSelectedHaveExistingKeys && hasPlaceholderKeys && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                You already have API keys for the selected servers. Replace <code className="rounded bg-zinc-200 px-1 text-xs dark:bg-zinc-700">&lt;your-api-key&gt;</code> in the config with your existing key, or generate new ones:
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {getSelectedMcps().filter((m) => m.isPlaceholder).map((m) => (
                  <button
                    key={m.name}
                    onClick={() => handleGenerateKey(m.name)}
                    disabled={generating === m.name}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-600 dark:hover:text-zinc-200"
                  >
                    {generating === m.name ? 'Generating...' : `Regenerate ${m.name} key`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {allSelectedHaveExistingKeys && !hasPlaceholderKeys && (
            <p className="mt-3 text-sm text-zinc-400">
              Using your freshly generated keys for the config below.
            </p>
          )}

          {/* Tab toggle */}
          <div className="mt-8 flex rounded-lg border border-zinc-200 p-1 dark:border-zinc-800">
            {([
              { key: 'poke' as const, label: 'Poke' },
              { key: 'claude-desktop' as const, label: 'Claude Desktop' },
              { key: 'claude-code' as const, label: 'Claude Code' },
              { key: 'cursor' as const, label: 'Cursor' },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setConfigTarget(tab.key)}
                className={`flex-1 rounded-md px-2 py-2.5 text-sm font-medium transition-colors sm:px-3 ${
                  configTarget === tab.key
                    ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Instructions per target */}
          <div className="mt-4 rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
            {configTarget === 'claude-desktop' && (
              <div className="space-y-2.5 text-base text-zinc-600 dark:text-zinc-400">
                <p>1. Open Claude Desktop &rarr; <strong>Settings</strong> &rarr; <strong>Developer</strong></p>
                <p>2. Click <strong>&quot;Edit Config&quot;</strong> to open <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">claude_desktop_config.json</code></p>
                <p>3. Paste the JSON below and save</p>
                <p>4. Restart Claude Desktop</p>
              </div>
            )}
            {configTarget === 'claude-code' && (
              <div className="space-y-2.5 text-base text-zinc-600 dark:text-zinc-400">
                <p>1. Open your terminal</p>
                <p>2. Run the command{getSelectedMcps().length > 1 ? 's' : ''} below to add the MCP server{getSelectedMcps().length > 1 ? 's' : ''}</p>
                <p>3. Claude Code will pick up the new server{getSelectedMcps().length > 1 ? 's' : ''} automatically</p>
              </div>
            )}
            {configTarget === 'cursor' && (
              <div className="space-y-2.5 text-base text-zinc-600 dark:text-zinc-400">
                <p>1. In your project root, create <code className="rounded bg-zinc-100 px-1 text-xs dark:bg-zinc-800">.cursor/mcp.json</code></p>
                <p>2. Paste the JSON below and save</p>
                <p>3. Restart Cursor or reload the window</p>
              </div>
            )}
            {configTarget === 'poke' && (
              <div className="space-y-2.5 text-base text-zinc-600 dark:text-zinc-400">
                <p>1. Open <strong>poke.com</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Connections</strong></p>
                <p>2. Click <strong>&quot;Add Integration&quot;</strong> &rarr; <strong>&quot;Create&quot;</strong></p>
                <p>3. For each MCP server, fill in:</p>
                {getSelectedMcps().map((m) => (
                  <div key={m.name} className="mt-2 rounded-md bg-zinc-50 p-3 dark:bg-zinc-900">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold capitalize text-zinc-700 dark:text-zinc-300">{m.name}</span>
                    </div>
                    <div className="mt-1.5 space-y-1 text-xs">
                      <div><span className="text-zinc-400">Name:</span> <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{m.name}</code></div>
                      <div><span className="text-zinc-400">MCP Server URL:</span> <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800 break-all">{m.url}</code></div>
                      <div><span className="text-zinc-400">API Key:</span> <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800 break-all">{m.key}</code></div>
                    </div>
                  </div>
                ))}
                <p className="mt-2">4. Click <strong>&quot;Create Integration&quot;</strong> for each</p>
              </div>
            )}
          </div>

          {/* Config block (not for Poke) */}
          {configTarget !== 'poke' && (
            <div className="mt-4">
              <div className="relative">
                <pre className="overflow-x-auto rounded-lg border border-zinc-300 bg-zinc-200 p-5 text-sm leading-relaxed text-zinc-800 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {buildConfig()}
                </pre>
                <button
                  onClick={handleCopyConfig}
                  className="absolute right-3 top-3 rounded border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-600 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                >
                  {copiedConfig ? 'Copied!' : 'Copy'}
                </button>
              </div>
              {configTarget === 'claude-code' && (
                <p className="mt-2 text-xs text-zinc-400">Run in your terminal. One command per MCP server.</p>
              )}
              {configTarget === 'cursor' && (
                <p className="mt-2 text-xs text-zinc-400">Save as <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">.cursor/mcp.json</code> in your project root.</p>
              )}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <button
              onClick={() => setStep(allSelectedHaveExistingKeys ? 0 : 1)}
              className="rounded-lg border border-zinc-200 px-5 py-3.5 text-base font-medium text-zinc-600 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Verify Connection */}
      {step === 3 && (
        <div>
          <h2 className="text-2xl font-bold sm:text-3xl">Verify connection</h2>
          <p className="mt-2 text-base text-zinc-500">
            Make any MCP tool call from your AI client to confirm everything is working.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center rounded-lg border border-zinc-200 p-10 dark:border-zinc-800">
            {verifyStatus.connected ? (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="3" className="text-green-600 dark:text-green-400">
                    <path d="M10 20l8 8 12-12" />
                  </svg>
                </div>
                <h3 className="mt-5 text-xl font-semibold text-green-700 dark:text-green-400">Connected!</h3>
                <p className="mt-2 text-base text-zinc-500">
                  First call: <strong>{verifyStatus.toolName}</strong> on <strong>{verifyStatus.mcpName}</strong>
                </p>
                {verifyStatus.firstCallAt && (
                  <p className="mt-1 text-sm text-zinc-400">
                    {new Date(verifyStatus.firstCallAt).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800">
                  <span className="relative flex h-5 w-5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-zinc-400 opacity-75" />
                    <span className="relative inline-flex h-5 w-5 rounded-full bg-zinc-500" />
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-semibold">Waiting for your first MCP call...</h3>
                <p className="mt-2 text-base text-zinc-500">
                  Open your AI client and try a tool from the MCP servers you configured.
                </p>
              </>
            )}
          </div>

          <div className="mt-8 flex flex-col gap-3">
            {verifyStatus.connected ? (
              <button
                onClick={handleComplete}
                disabled={completing}
                className="w-full rounded-lg bg-zinc-900 px-4 py-3.5 text-base font-semibold text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
              >
                {completing ? 'Redirecting...' : 'Go to Dashboard'}
              </button>
            ) : (
              <>
                <button
                  onClick={() => setStep(2)}
                  className="w-full rounded-lg border border-zinc-200 px-4 py-3.5 text-base font-medium text-zinc-600 transition-colors hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                >
                  Back
                </button>
                <button
                  onClick={handleSkip}
                  disabled={completing}
                  className="text-base text-zinc-400 underline transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
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
