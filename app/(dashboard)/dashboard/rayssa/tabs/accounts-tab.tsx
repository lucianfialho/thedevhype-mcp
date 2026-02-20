'use client';

import { useState, useTransition } from 'react';
import { disconnectAccount } from '../actions';

interface Account {
  id: number;
  platform: string;
  username: string | null;
  displayName: string | null;
  createdAt: string;
}

interface AccountsTabProps {
  accounts: Account[];
  onAccountsChange: (accounts: Account[]) => void;
  oauthError: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  not_authenticated: 'You need to be logged in to connect an account.',
  invalid_state: 'OAuth state mismatch. Please try again.',
  missing_params: 'Missing OAuth parameters. Please try again.',
  missing_verifier: 'Session expired. Please try again.',
  token_exchange_failed: 'Failed to exchange token with Twitter. Please try again.',
  user_fetch_failed: 'Failed to fetch your Twitter profile. Please try again.',
  access_denied: 'You denied access. No account was connected.',
};

export function AccountsTab({ accounts, onAccountsChange, oauthError }: AccountsTabProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState<number | null>(null);

  function handleDisconnect(accountId: number) {
    startTransition(async () => {
      const result = await disconnectAccount(accountId);
      if (result.error) {
        setError(result.error);
        return;
      }
      onAccountsChange(accounts.filter((a) => a.id !== accountId));
      setConfirmDisconnect(null);
    });
  }

  return (
    <div>
      <h3 className="mb-1 text-lg font-semibold text-slate-800">Connected Accounts</h3>
      <p className="mb-4 text-sm text-slate-500">
        Connect your social media accounts to publish posts.
      </p>

      {oauthError && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5">
          <p className="text-sm text-red-600">
            {ERROR_MESSAGES[oauthError] || `OAuth error: ${oauthError}`}
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-2.5">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Connected accounts */}
      {accounts.map((account) => (
        <div
          key={account.id}
          className="mb-3 flex items-center gap-3 rounded-2xl border border-slate-200 p-4"
        >
          {account.platform === 'linkedin' ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A66C2]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-base font-medium text-slate-800">
              {account.displayName || account.username}
            </p>
            <p className="text-sm text-slate-500">@{account.username}</p>
          </div>
          {confirmDisconnect === account.id ? (
            <div className="flex gap-2">
              <button
                onClick={() => handleDisconnect(account.id)}
                disabled={isPending}
                className="rounded-lg bg-red-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDisconnect(null)}
                className="rounded-lg px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDisconnect(account.id)}
              className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-red-500 hover:bg-red-50"
            >
              Disconnect
            </button>
          )}
        </div>
      ))}

      {/* Connect buttons */}
      <div className="flex flex-col gap-3">
        {!accounts.some((a) => a.platform === 'twitter') && (
          <a
            href="/api/auth/twitter"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4 transition-colors hover:border-slate-400 hover:bg-slate-50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-slate-800">Connect X (Twitter)</p>
              <p className="text-sm text-slate-500">Authorize to publish tweets from Rayssa</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-slate-400">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </a>
        )}

        {!accounts.some((a) => a.platform === 'linkedin') && (
          <a
            href="/api/auth/linkedin"
            className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 p-4 transition-colors hover:border-[#0A66C2]/40 hover:bg-blue-50/50"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0A66C2]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-medium text-slate-800">Connect LinkedIn</p>
              <p className="text-sm text-slate-500">Authorize to publish posts from Rayssa</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="shrink-0 text-slate-400">
              <path d="M6 4l4 4-4 4" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
