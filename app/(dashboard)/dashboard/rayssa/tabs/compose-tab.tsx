'use client';

import { useState, useTransition } from 'react';
import { createPost } from '../actions';
import type { Post } from '@/app/lib/mcp/servers/rayssa.schema';

interface ComposeTabProps {
  accounts: Array<{ id: number; platform: string; username: string | null; displayName: string | null }>;
  onPostCreated: (post: Post) => void;
}

export function ComposeTab({ accounts, onPostCreated }: ComposeTabProps) {
  const [content, setContent] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(accounts[0]?.id ?? 0);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedPlatform = accounts.find((a) => a.id === selectedAccount)?.platform || 'twitter';
  const charLimit = selectedPlatform === 'linkedin' ? 3000 : 280;
  const charCount = content.length;
  const isOverLimit = charCount > charLimit;
  const warnThreshold = selectedPlatform === 'linkedin' ? charLimit - 200 : charLimit - 20;
  const canSubmit = content.trim().length > 0 && !isOverLimit && selectedAccount > 0 && !isPending;

  function handleSaveDraft() {
    if (!canSubmit) return;
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      const result = await createPost(content, selectedAccount);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        onPostCreated(result.data);
        setContent('');
        setSuccess('Draft saved!');
        setTimeout(() => setSuccess(null), 2000);
      }
    });
  }

  if (accounts.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 py-10 text-center">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-2 text-slate-400">
          <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <line x1="20" y1="8" x2="20" y2="14" />
          <line x1="23" y1="11" x2="17" y2="11" />
        </svg>
        <p className="text-base text-slate-500">No accounts connected</p>
        <p className="mt-1 text-sm text-slate-400">Go to Accounts tab to connect X or LinkedIn.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Account selector */}
      {accounts.length > 1 && (
        <div className="mb-3">
          <label className="mb-1 block text-sm font-medium text-slate-500">Account</label>
          <select
            value={selectedAccount}
            onChange={(e) => setSelectedAccount(Number(e.target.value))}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.platform === 'linkedin' ? '🔷' : '𝕏'} {a.displayName || a.username || a.platform}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={selectedPlatform === 'linkedin' ? "What do you want to talk about?" : "What's happening?"}
          rows={5}
          className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span
            className={`text-sm font-medium ${
              isOverLimit ? 'text-red-500' : charCount > warnThreshold ? 'text-amber-500' : 'text-slate-400'
            }`}
          >
            {charCount}/{charLimit}
          </span>
        </div>
      </div>

      {/* Preview */}
      {content.trim() && (
        <div className="mt-3 rounded-2xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-slate-200" />
            <div>
              <p className="text-sm font-semibold text-slate-800">
                {accounts.find((a) => a.id === selectedAccount)?.displayName || 'You'}
              </p>
              <p className="text-xs text-slate-400">
                @{accounts.find((a) => a.id === selectedAccount)?.username || 'user'}
              </p>
            </div>
          </div>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{content}</p>
        </div>
      )}

      {/* Error / Success */}
      {error && (
        <div className="mt-3 rounded-xl bg-red-50 px-4 py-2">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="mt-3 rounded-xl bg-green-50 px-4 py-2">
          <p className="text-sm text-green-600">{success}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleSaveDraft}
          disabled={!canSubmit}
          className="flex-1 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save draft'}
        </button>
      </div>
    </div>
  );
}
