'use client';

import { useState } from 'react';
import { submitWaitlist } from './actions';

const BUILDING_OPTIONS = [
  { emoji: '🚀', label: 'SaaS' },
  { emoji: '🏢', label: 'Agency' },
  { emoji: '📰', label: 'Content & Newsletter' },
  { emoji: '🔧', label: 'Side project' },
  { emoji: '👀', label: 'Just exploring' },
];

const AI_TOOLS_OPTIONS = [
  'Claude',
  'ChatGPT',
  'Cursor',
  'GitHub Copilot',
  'Other',
];

export function WaitlistForm() {
  const [step, setStep] = useState(0);
  const [building, setBuilding] = useState('');
  const [aiTools, setAiTools] = useState<Set<string>>(new Set());
  const [mcpExcitement, setMcpExcitement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [position, setPosition] = useState<number | null>(null);

  function toggleAiTool(tool: string) {
    setAiTools((prev) => {
      const next = new Set(prev);
      if (next.has(tool)) next.delete(tool);
      else next.add(tool);
      return next;
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const result = await submitWaitlist({
        building,
        aiTools: Array.from(aiTools).join(', '),
        mcpExcitement,
      });
      setPosition(result.position);
    } catch {
      setSubmitting(false);
    }
  }

  // Done screen
  if (position !== null) {
    return (
      <div className="flex flex-col items-center py-8 text-center sm:py-16">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-4xl dark:bg-emerald-900/50">
          🎉
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight dark:text-white sm:text-3xl">
          You&apos;re on the list!
        </h2>
        <p className="mt-2 text-lg font-semibold text-zinc-500">
          #{position} in line
        </p>
        <p className="mx-auto mt-4 max-w-sm text-sm text-zinc-500">
          We&apos;ll let you know when it&apos;s your turn. Keep an eye on your email.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-400">
          Step {step + 1} of 3
        </span>
      </div>
      <div className="mb-8 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i <= step
                ? 'bg-zinc-900 dark:bg-white'
                : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          />
        ))}
      </div>

      {/* Step 1: What are you building? */}
      {step === 0 && (
        <div>
          <h2 className="text-xl font-bold tracking-tight dark:text-white sm:text-2xl">
            What are you building?
          </h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Help us understand how you&apos;ll use thedevhype.
          </p>

          <div className="mt-6 space-y-3">
            {BUILDING_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                onClick={() => setBuilding(opt.label)}
                className={`w-full rounded-lg border p-4 text-left transition-all ${
                  building === opt.label
                    ? 'border-zinc-900 bg-zinc-900/5 dark:border-white dark:bg-white/5'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{opt.emoji}</span>
                  <span className="text-sm font-medium dark:text-white">
                    {opt.label}
                  </span>
                  <div className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    building === opt.label
                      ? 'border-zinc-900 bg-zinc-900 dark:border-white dark:bg-white'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {building === opt.label && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white dark:text-zinc-900">
                        <path d="M2.5 6l2.5 2.5 4.5-4.5" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            disabled={!building}
            className="mt-6 w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Which AI tools do you use? */}
      {step === 1 && (
        <div>
          <h2 className="text-xl font-bold tracking-tight dark:text-white sm:text-2xl">
            Which AI tools do you use daily?
          </h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Select all that apply.
          </p>

          <div className="mt-6 space-y-3">
            {AI_TOOLS_OPTIONS.map((tool) => (
              <button
                key={tool}
                onClick={() => toggleAiTool(tool)}
                className={`w-full rounded-lg border p-4 text-left transition-all ${
                  aiTools.has(tool)
                    ? 'border-zinc-900 bg-zinc-900/5 dark:border-white dark:bg-white/5'
                    : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium dark:text-white">
                    {tool}
                  </span>
                  <div className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                    aiTools.has(tool)
                      ? 'border-zinc-900 bg-zinc-900 dark:border-white dark:bg-white'
                      : 'border-zinc-300 dark:border-zinc-600'
                  }`}>
                    {aiTools.has(tool) && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-white dark:text-zinc-900">
                        <path d="M2.5 6l2.5 2.5 4.5-4.5" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="rounded-lg border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400"
            >
              Back
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={aiTools.size === 0}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: MCP excitement */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-bold tracking-tight dark:text-white sm:text-2xl">
            What excites you most about MCP?
          </h2>
          <p className="mt-1.5 text-sm text-zinc-500">
            Optional, but we&apos;d love to hear it.
          </p>

          <textarea
            value={mcpExcitement}
            onChange={(e) => setMcpExcitement(e.target.value.slice(0, 280))}
            placeholder="e.g. I want my AI to access my feeds and organize my notes automatically"
            rows={4}
            className="mt-6 w-full resize-none rounded-lg border border-zinc-200 bg-transparent p-4 text-sm placeholder:text-zinc-400 focus:border-zinc-400 focus:outline-none dark:border-zinc-800 dark:text-white dark:placeholder:text-zinc-500 dark:focus:border-zinc-600"
          />
          <div className="mt-1 text-right text-xs text-zinc-400">
            {mcpExcitement.length}/280
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="rounded-lg border border-zinc-200 px-5 py-3 text-sm font-medium text-zinc-500 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:text-zinc-400"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 rounded-lg bg-zinc-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
            >
              {submitting ? 'Submitting...' : 'Join the waitlist'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function WaitlistStatus({ position }: { position: number }) {
  return (
    <div className="flex flex-col items-center py-8 text-center sm:py-16">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-blue-100 text-4xl dark:bg-blue-900/50">
        ⏳
      </div>
      <h2 className="mt-6 text-2xl font-bold tracking-tight dark:text-white sm:text-3xl">
        You&apos;re on the list!
      </h2>
      <p className="mt-2 text-lg font-semibold text-zinc-500">
        #{position} in line
      </p>
      <p className="mx-auto mt-4 max-w-sm text-sm text-zinc-500">
        We&apos;ll let you know when it&apos;s your turn. Keep an eye on your email.
      </p>
    </div>
  );
}
