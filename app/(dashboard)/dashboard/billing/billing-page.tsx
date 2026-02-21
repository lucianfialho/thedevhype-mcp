'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppShell, SectionHeader, ListCard } from '../components/ui';
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
  const pastSubscriptions = allSubscriptions.filter((s) => s.status !== 'active');

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
    <AppShell title="Billing">
      <div className="mb-4 shrink-0">
        <h2 className="text-lg font-bold text-slate-800">Billing</h2>
        <p className="text-sm text-slate-500">Manage your subscriptions and billing.</p>
      </div>

      <div className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Grandfathered badge */}
        {grandfathered && (
          <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#059669" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 8l3 3 7-7" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-800">Beta User — Free Access</p>
                <p className="text-xs text-emerald-600">Approved before launch. Free access to all MCP tools.</p>
              </div>
            </div>
          </div>
        )}

        {/* Active subscriptions */}
        {activeSubscriptions.length > 0 && (
          <div className="mb-5">
            <SectionHeader title="Active Subscriptions" />
            <div className="space-y-2">
              {activeSubscriptions.map((sub) => {
                const planConfig = PLANS[sub.plan as keyof typeof PLANS];
                const renewDate = new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });
                return (
                  <ListCard
                    key={sub.plan}
                    title={planConfig?.name || sub.plan}
                    subtitle={
                      sub.cancelAtPeriodEnd
                        ? `Cancels on ${renewDate}`
                        : `Renews on ${renewDate}`
                    }
                    right={
                      <div className="flex items-center gap-2">
                        {sub.cancelAtPeriodEnd ? (
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Canceling</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">Active</span>
                        )}
                        {planConfig && (
                          <span className="text-sm font-semibold text-slate-700">${planConfig.priceMonthly}/mo</span>
                        )}
                      </div>
                    }
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* No subscription + not grandfathered */}
        {!grandfathered && activeSubscriptions.length === 0 && (
          <div className="mb-5 rounded-2xl border border-slate-200 p-6 text-center">
            <p className="text-sm text-slate-500">No active subscriptions</p>
            <Link
              href="/pricing"
              className="mt-3 inline-block rounded-xl bg-slate-800 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              View Plans
            </Link>
          </div>
        )}

        {/* Past subscriptions */}
        {pastSubscriptions.length > 0 && (
          <div className="mb-5">
            <SectionHeader title="Past Subscriptions" />
            <div className="space-y-2">
              {pastSubscriptions.map((sub, i) => {
                const planConfig = PLANS[sub.plan as keyof typeof PLANS];
                return (
                  <ListCard
                    key={i}
                    title={planConfig?.name || sub.plan}
                    className="opacity-50"
                    right={
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        {sub.status}
                      </span>
                    }
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* Manage billing button */}
        {allSubscriptions.length > 0 && (
          <button
            onClick={openPortal}
            disabled={portalLoading}
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            {portalLoading ? 'Opening...' : 'Manage Billing'}
          </button>
        )}
      </div>
    </AppShell>
  );
}
