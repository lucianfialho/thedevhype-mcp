'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PLANS, type PlanName } from '@/app/lib/billing/config';

const MCP_ICONS: Record<string, { icon: string; color: string }> = {
  eloa: { icon: '/eloa.png', color: 'border-sky-500/30 bg-sky-500/10' },
  otto: { icon: '/otto.png', color: 'border-emerald-500/30 bg-emerald-500/10' },
  familia: { icon: '', color: 'border-violet-500/30 bg-violet-500/10' },
  rayssa: { icon: '/rayssa.png', color: 'border-pink-500/30 bg-pink-500/10' },
  lucian: { icon: '/lucian.png', color: 'border-amber-500/30 bg-amber-500/10' },
};

const INDIVIDUAL_PLANS: PlanName[] = ['eloa', 'otto', 'familia', 'rayssa', 'lucian'];

export function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function handleSubscribe(plan: PlanName) {
    setLoading(plan);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        alert(data.error);
      }
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  }

  const individualSum = INDIVIDUAL_PLANS.reduce((sum, p) => sum + PLANS[p].priceMonthly, 0);

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <img src="/logo.png" alt="thedevhype" className="h-7 w-7" />
            <span className="text-lg font-semibold">thedevhype</span>
          </Link>
          <Link
            href="/dashboard"
            className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-16">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
            Subscribe to individual MCP tools or get the bundle and save 50%.
            Beta users approved before launch keep free access.
          </p>
        </div>

        {/* Bundle CTA */}
        <div className="mb-12 overflow-hidden rounded-2xl border-2 border-indigo-500/50 bg-gradient-to-br from-indigo-500/10 to-violet-500/10">
          <div className="flex flex-col items-center gap-6 p-8 sm:flex-row sm:justify-between">
            <div>
              <div className="mb-2 inline-block rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-semibold text-indigo-300">
                BEST VALUE — SAVE 50%
              </div>
              <h2 className="text-2xl font-bold">All-in-One Bundle</h2>
              <p className="mt-1 text-zinc-400">
                Get all 5 MCP tools: Eloa, Otto, Familia, Rayssa, and Lucian.
              </p>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-4xl font-bold">${PLANS.bundle.priceMonthly}</span>
                <span className="text-zinc-400">/month</span>
                <span className="ml-2 text-sm text-zinc-500 line-through">${individualSum}/mo</span>
              </div>
            </div>
            <button
              onClick={() => handleSubscribe('bundle')}
              disabled={loading === 'bundle'}
              className="shrink-0 rounded-xl bg-indigo-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading === 'bundle' ? 'Redirecting...' : 'Get the Bundle'}
            </button>
          </div>
        </div>

        {/* Individual plans grid */}
        <h3 className="mb-6 text-center text-lg font-medium text-zinc-400">Or subscribe individually</h3>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {INDIVIDUAL_PLANS.map((planKey) => {
            const plan = PLANS[planKey];
            const iconInfo = MCP_ICONS[planKey];
            return (
              <div
                key={planKey}
                className="flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  {iconInfo.icon ? (
                    <img src={iconInfo.icon} alt={plan.name} className="h-10 w-10 rounded-full" />
                  ) : (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full text-lg font-semibold ${iconInfo.color}`}>
                      {plan.name[0]}
                    </div>
                  )}
                  <div>
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                  </div>
                </div>
                <p className="mb-4 flex-1 text-sm text-zinc-400">{plan.description}</p>
                <div className="mb-4 flex items-baseline gap-1">
                  <span className="text-3xl font-bold">${plan.priceMonthly}</span>
                  <span className="text-zinc-400">/mo</span>
                </div>
                <button
                  onClick={() => handleSubscribe(planKey)}
                  disabled={loading === planKey}
                  className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-zinc-700 disabled:opacity-50"
                >
                  {loading === planKey ? 'Redirecting...' : 'Subscribe'}
                </button>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-20 max-w-2xl">
          <h2 className="mb-8 text-center text-2xl font-bold">Frequently asked questions</h2>
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="mb-1 font-semibold text-zinc-200">What happens to beta users?</h3>
              <p className="text-zinc-400">
                Users approved on the waitlist before the billing launch date keep free access to all MCP tools indefinitely. No action needed.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-zinc-200">Can I cancel anytime?</h3>
              <p className="text-zinc-400">
                Yes. You can cancel from the Stripe Customer Portal. Access continues until the end of your billing period.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-zinc-200">What&apos;s included with Lucian?</h3>
              <p className="text-zinc-400">
                Lucian includes 50 NFC-e receipt extractions per month (up from 10 for free users), plus all price tracking, categorization, and shopping list features.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-zinc-200">Can I switch between individual and bundle?</h3>
              <p className="text-zinc-400">
                Yes. Cancel your current subscription(s) and subscribe to the bundle (or vice versa) at any time.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
