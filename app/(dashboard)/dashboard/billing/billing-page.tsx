'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLANS } from '@/app/lib/billing/config';

interface SubscriptionInfo {
  plan: string;
  status: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface BillingPageProps {
  grandfathered: boolean;
  allSubscriptions: SubscriptionInfo[];
}

export function BillingPage({ grandfathered, allSubscriptions }: BillingPageProps) {
  const [portalLoading, setPortalLoading] = useState(false);

  const activeSubscriptions = allSubscriptions.filter((s) => s.status === 'active');

  async function openPortal() {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Could not open billing portal');
      }
    } catch {
      alert('Something went wrong');
    } finally {
      setPortalLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 4l-4 4 4 4" />
          </svg>
          Back to dashboard
        </Link>

        <h1 className="mb-2 text-2xl font-bold">Billing</h1>
        <p className="mb-8 text-zinc-400">Manage your subscriptions and billing.</p>

        {/* Grandfathered badge */}
        {grandfathered && (
          <div className="mb-8 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 8l3 3 7-7" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-emerald-300">Beta User — Free Access</p>
                <p className="text-sm text-emerald-400/70">You were approved before launch and have free access to all MCP tools.</p>
              </div>
            </div>
          </div>
        )}

        {/* Active subscriptions */}
        {activeSubscriptions.length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Active Subscriptions</h2>
            <div className="space-y-3">
              {activeSubscriptions.map((sub) => {
                const planConfig = PLANS[sub.plan as keyof typeof PLANS];
                const renewDate = new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                return (
                  <div key={sub.plan} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{planConfig?.name || sub.plan}</p>
                        <p className="text-sm text-zinc-400">
                          {sub.cancelAtPeriodEnd
                            ? `Cancels on ${renewDate}`
                            : `Renews on ${renewDate}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {sub.cancelAtPeriodEnd ? (
                          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-300">Canceling</span>
                        ) : (
                          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-300">Active</span>
                        )}
                        {planConfig && (
                          <span className="text-sm font-semibold text-zinc-300">${planConfig.priceMonthly}/mo</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past/inactive subscriptions */}
        {allSubscriptions.filter((s) => s.status !== 'active').length > 0 && (
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold text-zinc-400">Past Subscriptions</h2>
            <div className="space-y-3">
              {allSubscriptions
                .filter((s) => s.status !== 'active')
                .map((sub, i) => {
                  const planConfig = PLANS[sub.plan as keyof typeof PLANS];
                  return (
                    <div key={i} className="rounded-xl border border-zinc-800/50 bg-zinc-900/30 p-4 opacity-60">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{planConfig?.name || sub.plan}</p>
                        <span className="rounded-full bg-zinc-700/50 px-2 py-0.5 text-xs font-medium text-zinc-400">
                          {sub.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          {allSubscriptions.length > 0 && (
            <button
              onClick={openPortal}
              disabled={portalLoading}
              className="rounded-xl bg-white/10 px-5 py-2.5 text-sm font-semibold transition-colors hover:bg-white/15 disabled:opacity-50"
            >
              {portalLoading ? 'Opening...' : 'Manage Billing'}
            </button>
          )}
          {!grandfathered && activeSubscriptions.length === 0 && (
            <Link
              href="/pricing"
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500"
            >
              View Plans
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
