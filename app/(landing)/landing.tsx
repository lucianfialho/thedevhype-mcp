'use client';

import { useState } from 'react';
import { authClient } from '@/app/lib/auth/client';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" className={className}>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

function signInWithGitHub() {
  authClient.signIn.social({ provider: 'github', callbackURL: '/dashboard' });
}

const btnClass = "cursor-pointer flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100";
const btnClassLg = "cursor-pointer flex items-center gap-2.5 rounded-lg bg-zinc-900 px-8 py-3.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100";
const btnClassCta = "cursor-pointer inline-flex items-center gap-2.5 rounded-lg bg-zinc-900 px-8 py-3 text-sm font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100";

function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-5 sm:px-10">
      <div className="flex items-center gap-2">
        <img src="/logo.png" alt="thedevhype" className="h-7 w-7" />
        <span className="text-lg font-bold">thedevhype</span>
      </div>
      <button
        onClick={signInWithGitHub}
        className={btnClass}
      >
        <GitHubIcon className="h-4 w-4" />
        Sign in with GitHub
      </button>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto max-w-4xl px-6 pt-16 pb-12 text-center sm:pt-24 sm:pb-16">
      <div className="mb-8 flex justify-center">
        <div className="flex -space-x-4">
          <img src="/otto.png" alt="Otto" className="h-20 w-20 rounded-full border-3 border-white dark:border-zinc-900" />
          <img src="/eloa.png" alt="Eloa" className="h-20 w-20 rounded-full border-3 border-white dark:border-zinc-900" />
          <img src="/lucian.png" alt="Lucian" className="h-20 w-20 rounded-full border-3 border-white dark:border-zinc-900" />
        </div>
      </div>

      <h1 className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
        Your AI tools.
        <br />
        One hub.
      </h1>

      <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-500 sm:text-xl">
        Connect, manage and monitor your MCP servers.
        Personal AI assistants that actually work for you.
      </p>

      <div className="mt-10 flex justify-center">
        <button
          onClick={signInWithGitHub}
          className={btnClassLg}
        >
          <GitHubIcon className="h-5 w-5" />
          Continue with GitHub
        </button>
      </div>
    </section>
  );
}

function BrowserMockup({ url, children }: { url: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
      <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
        <div className="flex gap-1.5">
          <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
        </div>
        <div className="ml-4 flex-1 rounded-md bg-zinc-100 px-3 py-1 text-xs text-zinc-400 dark:bg-zinc-800">
          {url}
        </div>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}

function TabBar({ tabs, active, onChange }: { tabs: string[]; active: number; onChange: (i: number) => void }) {
  return (
    <div className="mb-6 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
      {tabs.map((t, i) => (
        <button
          key={t}
          onClick={() => onChange(i)}
          className={`cursor-pointer flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            i === active
              ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
              : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

/* ─── Lucian Showcase (Gastos | Precos | Lista | Notas) ─── */

function LucianGastos() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">Total spent</div>
          <div className="mt-1 text-lg font-bold">R$ 2.847,32</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">Purchases</div>
          <div className="mt-1 text-lg font-bold">14</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">Average</div>
          <div className="mt-1 text-lg font-bold">R$ 203,38</div>
        </div>
      </div>

      {/* Mini line chart */}
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="mb-2 text-xs font-medium text-zinc-400">Last 6 months</div>
        <svg viewBox="0 0 300 80" className="w-full" fill="none">
          <polyline
            points="10,60 60,45 120,55 180,30 240,35 290,15"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-emerald-500"
          />
          {[
            [10, 60], [60, 45], [120, 55], [180, 30], [240, 35], [290, 15],
          ].map(([cx, cy], i) => (
            <circle key={i} cx={cx} cy={cy} r="3" fill="currentColor" className="text-emerald-500" />
          ))}
          {['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev'].map((m, i) => (
            <text key={m} x={10 + i * 56} y={76} fontSize="9" fill="currentColor" className="text-zinc-400">
              {m}
            </text>
          ))}
        </svg>
      </div>

      {/* Category bars */}
      <div className="space-y-2.5">
        {[
          { name: 'Alimentos', pct: 45, color: 'bg-emerald-500' },
          { name: 'Limpeza', pct: 22, color: 'bg-blue-500' },
          { name: 'Higiene', pct: 18, color: 'bg-amber-500' },
          { name: 'Bebidas', pct: 15, color: 'bg-purple-500' },
        ].map((c) => (
          <div key={c.name}>
            <div className="mb-1 flex justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">{c.name}</span>
              <span className="text-zinc-400">{c.pct}%</span>
            </div>
            <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800">
              <div className={`h-2 rounded-full ${c.color}`} style={{ width: `${c.pct}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LucianPrecos() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
        <div className="font-semibold">Arroz Tio João 5kg</div>
        <div className="mt-1 text-xs text-zinc-400">Last updated: Feb 15, 2026</div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950">
          <div className="text-xs text-emerald-600 dark:text-emerald-400">Lowest</div>
          <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-300">R$ 22,90</div>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900 dark:bg-red-950">
          <div className="text-xs text-red-600 dark:text-red-400">Highest</div>
          <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-300">R$ 31,50</div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900">
          <div className="text-xs text-zinc-500">Average</div>
          <div className="mt-1 text-lg font-bold">R$ 26,80</div>
        </div>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="border-b border-zinc-100 px-4 py-2 text-xs font-medium text-zinc-400 dark:border-zinc-800">
          History
        </div>
        {[
          { date: '15/02', store: 'Pão de Açúcar', price: 'R$ 24,90' },
          { date: '10/02', store: 'Carrefour', price: 'R$ 22,90' },
          { date: '03/02', store: 'Extra', price: 'R$ 31,50' },
        ].map((h) => (
          <div key={h.date + h.store} className="flex items-center justify-between border-b border-zinc-50 px-4 py-2.5 last:border-0 dark:border-zinc-800/50">
            <span className="text-xs text-zinc-400">{h.date}</span>
            <span className="text-sm text-zinc-600 dark:text-zinc-300">{h.store}</span>
            <span className="text-sm font-medium">{h.price}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function LucianLista() {
  const items = [
    { name: 'Arroz Tio João 5kg', qty: '1x', price: 'R$ 22,90', store: 'Carrefour', checked: true },
    { name: 'Feijão Carioca 1kg', qty: '2x', price: 'R$ 8,50', store: 'Extra', checked: true },
    { name: 'Leite Integral 1L', qty: '6x', price: 'R$ 5,20', store: 'Pão de Açúcar', checked: false },
    { name: 'Azeite Extra Virgem', qty: '1x', price: 'R$ 28,90', store: 'Carrefour', checked: false },
    { name: 'Café Melitta 500g', qty: '1x', price: 'R$ 18,40', store: 'Extra', checked: false },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        {items.map((item, i) => (
          <div
            key={item.name}
            className={`flex items-center gap-3 px-4 py-3 ${i < items.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
          >
            <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
              item.checked
                ? 'border-emerald-500 bg-emerald-500'
                : 'border-zinc-300 dark:border-zinc-600'
            }`}>
              {item.checked && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className={`min-w-0 flex-1 ${item.checked ? 'line-through opacity-50' : ''}`}>
              <div className="text-sm font-medium">{item.name}</div>
              <div className="text-xs text-zinc-400">{item.qty} &middot; {item.store}</div>
            </div>
            <span className="shrink-0 text-sm font-medium text-zinc-500">{item.price}</span>
          </div>
        ))}
      </div>
      <div className="text-center text-sm text-zinc-400">
        5 items &middot; <span className="font-medium text-zinc-600 dark:text-zinc-300">R$ 87,40</span> estimated
      </div>
    </div>
  );
}

function LucianNotas() {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { store: 'Pão de Açúcar', date: '15/02/2026', items: 8, total: 'R$ 247,30' },
          { store: 'Carrefour', date: '10/02/2026', items: 12, total: 'R$ 389,50' },
          { store: 'Extra', date: '03/02/2026', items: 5, total: 'R$ 156,80' },
        ].map((n) => (
          <div key={n.store + n.date} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
            <div className="font-medium text-sm">{n.store}</div>
            <div className="mt-1 text-xs text-zinc-400">{n.date}</div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-xs text-zinc-400">{n.items} items</span>
              <span className="text-sm font-bold">{n.total}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-800">
          <div className="text-lg font-bold">42</div>
          <div className="text-xs text-zinc-400">receipts</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-800">
          <div className="text-lg font-bold">R$ 8.234</div>
          <div className="text-xs text-zinc-400">total</div>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3 text-center dark:border-zinc-800">
          <div className="text-lg font-bold">6</div>
          <div className="text-xs text-zinc-400">stores</div>
        </div>
      </div>
    </div>
  );
}

function LucianShowcase() {
  const [tab, setTab] = useState(0);
  const tabs = ['Spending', 'Prices', 'Shopping List', 'Receipts'];
  const content = [<LucianGastos key="g" />, <LucianPrecos key="p" />, <LucianLista key="l" />, <LucianNotas key="n" />];

  const descriptions = [
    {
      title: 'Track your spending',
      text: 'See how much you spent this month, how many purchases you made, and your average ticket. Follow the trend over the last 6 months and discover where your money goes by category.',
      features: ['Monthly total and average per purchase', 'Trend chart over time', 'Breakdown by category'],
    },
    {
      title: 'Compare prices',
      text: 'Know where each product is cheapest. Lucian cross-references all your receipts and shows the lowest, highest, and average price with a history by store.',
      features: ['Lowest and highest price found', 'Average price across stores', 'History with date and store'],
    },
    {
      title: 'Smart shopping list',
      text: 'Build your list and Lucian suggests the cheapest store for each item based on your real purchase history. Check items off as you shop.',
      features: ['Estimated price per item', 'Cheapest store suggested', 'Estimated list total'],
    },
    {
      title: 'Your receipts',
      text: 'All receipts automatically extracted from Brazilian NFC-e. See a summary of each purchase, item count, and total spent per store over time.',
      features: ['Automatic NFC-e extraction', 'Summary by store and date', 'Overall totals and stats'],
    },
  ];

  return (
    <section className="border-t border-zinc-100 py-16 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6">
        {/* Section headline */}
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Know where your money goes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            Scan your grocery receipts and Lucian does the rest — tracks prices, compares stores, and shows exactly how you spend.
          </p>
        </div>

        {/* Agent card */}
        <div className="mb-10 flex items-center gap-4">
          <img src="/lucian.png" alt="Lucian" className="h-14 w-14 rounded-full" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-bold">Lucian</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                🇧🇷 Brazil only
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">Virtual Grocery Manager — NFC-e receipts, price tracking & spending analysis</p>
          </div>
        </div>

        {/* Tabs (full width) */}
        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        {/* Split: text + mockup */}
        <div className="mt-6 grid items-start gap-8 lg:grid-cols-5">
          {/* Text side */}
          <div className="lg:col-span-2 lg:py-4">
            <h3 className="text-xl font-bold">{descriptions[tab].title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">{descriptions[tab].text}</p>
            <ul className="mt-5 space-y-2.5">
              {descriptions[tab].features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0">
                    <path d="M5 9l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Mockup side */}
          <div className="lg:col-span-3">
            <BrowserMockup url="thedevhype.com/dashboard/lucian">
              {content[tab]}
            </BrowserMockup>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Eloa Showcase (Feed | Bookmarks | Busca) ─── */

function EloaFeed() {
  const articles = [
    { title: 'GA4 BigQuery Export: Complete Guide 2026', source: 'Analytics Mania', time: '2h ago', unread: true },
    { title: 'Server-side Tagging Best Practices', source: 'Simo Ahava', time: '5h ago', unread: true },
    { title: 'Understanding Consent Mode v2', source: 'Measure School', time: '1d ago', unread: false },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white dark:bg-white dark:text-zinc-900">All sources</span>
        <span className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-500 dark:border-zinc-700">Unread</span>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        {articles.map((a, i) => (
          <div
            key={a.title}
            className={`flex items-start gap-3 px-4 py-3 ${i < articles.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
          >
            {a.unread && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
            {!a.unread && <div className="mt-1.5 h-2 w-2 shrink-0" />}
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium">{a.title}</div>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {a.source}
                </span>
                <span className="text-xs text-zinc-400">{a.time}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EloaBookmarks() {
  const bookmarks = [
    { title: 'GTM Server-Side Setup Guide', url: 'simoahava.com/analytics/server-side...', tags: ['GTM', 'Server-side'] },
    { title: 'BigQuery ML for Marketers', url: 'cloud.google.com/bigquery-ml/docs...', tags: ['BigQuery', 'ML'] },
    { title: 'Core Web Vitals Optimization', url: 'web.dev/articles/vitals...', tags: ['Performance', 'SEO'] },
  ];

  const tagColors: Record<string, string> = {
    GTM: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    'Server-side': 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    BigQuery: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400',
    ML: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
    Performance: 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400',
    SEO: 'bg-pink-50 text-pink-600 dark:bg-pink-950 dark:text-pink-400',
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-zinc-400">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="ml-2 text-sm text-zinc-400">Search bookmarks...</span>
      </div>

      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        {bookmarks.map((b, i) => (
          <div
            key={b.title}
            className={`px-4 py-3 ${i < bookmarks.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
          >
            <div className="text-sm font-medium">{b.title}</div>
            <div className="mt-1 text-xs text-zinc-400 truncate">{b.url}</div>
            <div className="mt-2 flex gap-1.5">
              {b.tags.map((tag) => (
                <span key={tag} className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tagColors[tag] ?? 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EloaBusca() {
  const results = [
    {
      title: 'GA4 Web Analytics Implementation Guide',
      snippet: 'A comprehensive guide to implementing web analytics with Google Analytics 4, covering event tracking, custom dimensions...',
      source: 'Analytics Mania',
    },
    {
      title: 'Web Analytics Maturity Model',
      snippet: 'Understanding the five stages of web analytics maturity and how to advance your organization from basic to advanced...',
      source: 'Kaushik.net',
    },
    {
      title: 'Server-side Analytics Architecture',
      snippet: 'Modern web analytics architectures leveraging server-side tagging for improved data quality and privacy compliance...',
      source: 'Simo Ahava',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-zinc-400">
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
          <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        <span className="ml-2 text-sm text-zinc-900 dark:text-white">web analytics</span>
      </div>

      <div className="space-y-3">
        {results.map((r) => (
          <div key={r.title} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="text-sm font-medium text-blue-600 dark:text-blue-400">{r.title}</div>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{r.snippet}</p>
            <span className="mt-2 inline-block rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {r.source}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function EloaShowcase() {
  const [tab, setTab] = useState(0);
  const tabs = ['Feed', 'Bookmarks', 'Search'];
  const content = [<EloaFeed key="f" />, <EloaBookmarks key="b" />, <EloaBusca key="s" />];

  const descriptions = [
    {
      title: 'Your curated feed',
      text: 'All your RSS feeds aggregated in one place. Eloa highlights what\'s new, shows the source, and how long ago it was published. Filter by read and unread.',
      features: ['Multi-source aggregator', 'Unread indicators', 'Quick filters by status'],
    },
    {
      title: 'Bookmarks with tags',
      text: 'Save any article with color-coded tags to organize by topic. Search through your bookmarks whenever you need to find that link again.',
      features: ['Color-coded tags by topic', 'Full-text bookmark search', 'URL and source preserved'],
    },
    {
      title: 'Smart search',
      text: 'Search across everything Eloa has indexed — feed articles, bookmarks, and notes. Results are ranked with snippets so you find what you need fast.',
      features: ['Search across all saved content', 'Contextual snippets', 'Results ranked by relevance'],
    },
  ];

  return (
    <section className="border-t border-zinc-100 py-16 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6">
        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
          <img src="/eloa.png" alt="Eloa" className="h-14 w-14 rounded-full" />
          <div>
            <h2 className="text-2xl font-bold">Eloa</h2>
            <p className="mt-1 text-sm text-zinc-500">AI Content Curator — RSS feeds, bookmarks & full-text search</p>
          </div>
        </div>

        {/* Tabs (full width) */}
        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        {/* Split: mockup + text (reversed from Lucian for visual variety) */}
        <div className="mt-6 grid items-start gap-8 lg:grid-cols-5">
          {/* Mockup side */}
          <div className="order-2 lg:order-1 lg:col-span-3">
            <BrowserMockup url="thedevhype.com/dashboard/eloa">
              {content[tab]}
            </BrowserMockup>
          </div>

          {/* Text side */}
          <div className="order-1 lg:order-2 lg:col-span-2 lg:py-4">
            <h3 className="text-xl font-bold">{descriptions[tab].title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">{descriptions[tab].text}</p>
            <ul className="mt-5 space-y-2.5">
              {descriptions[tab].features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0">
                    <path d="M5 9l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Otto Showcase (Notes | Connections | People) ─── */

function OttoNotes() {
  const notes = [
    { title: 'Q1 Planning Meeting', tags: ['meetings', 'planning'], time: '2h ago', excerpt: 'Key decisions: Launch new pricing tier by March. Assign design review to Sarah...' },
    { title: 'AI Agents Research', tags: ['research', 'ai'], time: '1d ago', excerpt: 'Highlights from recent papers on tool-use agents. Key insight: context window management...' },
    { title: 'Weekly Reflection', tags: ['journal', 'weekly-review'], time: '3d ago', excerpt: 'Recurring theme: need to delegate more. Progress on side project was strong...' },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
        {notes.map((n, i) => (
          <div
            key={n.title}
            className={`px-4 py-3 ${i < notes.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
          >
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{n.title}</div>
              <span className="text-xs text-zinc-400">{n.time}</span>
            </div>
            <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{n.excerpt}</p>
            <div className="mt-2 flex gap-1.5">
              {n.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OttoConnections() {
  const entries = [
    { title: 'Q1 Planning Meeting', type: 'note', connections: ['Sarah Chen', 'Acme Corp', 'Pricing Strategy Notes'] },
    { title: 'AI Agents Research', type: 'highlight', connections: ['Tool-Use Paper Highlights', 'Weekly Reflection'] },
  ];

  return (
    <div className="space-y-4">
      {entries.map((e) => (
        <div key={e.title} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">{e.type}</span>
            <span className="text-sm font-medium">{e.title}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {e.connections.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 6h4M6 4v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                {c}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function OttoPeople() {
  const contacts = [
    { name: 'Sarah Chen', role: 'Product Lead at Acme Corp', tags: ['client', 'product'], notes: 3 },
    { name: 'Marcus Rivera', role: 'CTO at BuildFast', tags: ['investor', 'advisor'], notes: 5 },
    { name: 'Ana Kowalski', role: 'Design Lead', tags: ['collaborator'], notes: 2 },
  ];

  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800">
      {contacts.map((c, i) => (
        <div
          key={c.name}
          className={`flex items-center gap-3 px-4 py-3 ${i < contacts.length - 1 ? 'border-b border-zinc-100 dark:border-zinc-800' : ''}`}
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            {c.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium">{c.name}</div>
            <div className="text-xs text-zinc-400">{c.role}</div>
          </div>
          <span className="shrink-0 text-xs text-zinc-400">{c.notes} notes</span>
        </div>
      ))}
    </div>
  );
}

function OttoShowcase() {
  const [tab, setTab] = useState(0);
  const tabs = ['Notes', 'Connections', 'People'];
  const content = [<OttoNotes key="n" />, <OttoConnections key="c" />, <OttoPeople key="p" />];

  const descriptions = [
    {
      title: 'Your second brain',
      text: 'Save notes, links, highlights, people, and companies — all in markdown. Tag everything and find it instantly with full-text search.',
      features: ['Notes, links, highlights in markdown', 'Tags and full-text search', 'Automatic excerpts and timestamps'],
    },
    {
      title: 'Everything connected',
      text: 'Create bidirectional connections between any entries. Meeting notes link to people, research links to highlights, companies connect to contacts.',
      features: ['Bidirectional connections', 'Cross-type linking (notes ↔ people)', 'Visual knowledge graph'],
    },
    {
      title: 'Personal CRM built-in',
      text: 'Track people and companies with context. See connected notes, follow-up reminders, and relationship history — all from your second brain.',
      features: ['People and companies as entries', 'Connected notes per contact', 'Follow-up tracking via automations'],
    },
  ];

  return (
    <section className="border-t border-zinc-100 py-16 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-10 flex items-center gap-4">
          <img src="/otto.png" alt="Otto" className="h-14 w-14 rounded-full" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold">Otto</h2>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                New
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-500">Second Brain — notes, connections & personal knowledge graph</p>
          </div>
        </div>

        <TabBar tabs={tabs} active={tab} onChange={setTab} />

        <div className="mt-6 grid items-start gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2 lg:py-4">
            <h3 className="text-xl font-bold">{descriptions[tab].title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-500">{descriptions[tab].text}</p>
            <ul className="mt-5 space-y-2.5">
              {descriptions[tab].features.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0">
                    <path d="M5 9l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="lg:col-span-3">
            <BrowserMockup url="thedevhype.com/dashboard/otto">
              {content[tab]}
            </BrowserMockup>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Recipes Section ─── */

function RecipesSection() {
  const recipes = [
    { name: 'otto-meeting-notes', icon: '🥭', mcp: 'Otto', desc: 'Capture meeting notes, extract people, and connect everything.', url: 'https://poke.com/refer/oyL-KlVyM07', automations: 2 },
    { name: 'otto-research-capture', icon: '🍇', mcp: 'Otto', desc: 'Save highlights and links. Build a connected research archive.', url: 'https://poke.com/refer/TlEWWWPHv-q', automations: 1 },
    { name: 'otto-crm-lite', icon: '🍑', mcp: 'Otto', desc: 'Lightweight CRM. Track contacts, companies, and follow-ups.', url: 'https://poke.com/refer/l9MX8TqkwCv', automations: 2 },
    { name: 'otto-daily-journal', icon: '🍊', mcp: 'Otto + Eloa', desc: 'AI journaling with themes, reflections, and reading connections.', url: 'https://poke.com/refer/HGBvJbrL_r9', automations: 2 },
    { name: 'eloa-morning-briefing', icon: '🍋', mcp: 'Eloa', desc: 'Daily curated briefing from your RSS feeds.', url: 'https://poke.com/refer/wSdvBWVQQs8', automations: 2 },
    { name: 'eloa-bookmark-organizer', icon: '🫐', mcp: 'Eloa', desc: 'Auto-organize bookmarks with tags and weekly cleanup.', url: 'https://poke.com/refer/h8ml7tkoeG8', automations: 2 },
    { name: 'eloa-content-radar', icon: '🍓', mcp: 'Eloa', desc: 'Monitor competitors and get keyword alerts.', url: 'https://poke.com/refer/hscQ9_KAHKv', automations: 2 },
    { name: 'eloa-newsletter-digest', icon: '🥝', mcp: 'Eloa', desc: 'Curate the best articles for your newsletter.', url: 'https://poke.com/refer/WCLlTuKSRA-', automations: 2 },
    { name: 'second-brain-reader', icon: '🥑', mcp: 'Otto + Eloa', desc: 'Read in Eloa, save highlights to Otto, auto cross-link.', url: 'https://poke.com/refer/gyoLYaC8bf5', automations: 2 },
  ];

  const mcpColors: Record<string, string> = {
    Otto: 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400',
    Eloa: 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
    'Otto + Eloa': 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400',
  };

  return (
    <section className="border-t border-zinc-100 py-16 dark:border-zinc-800">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready-made recipes
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-500">
            Pre-configured automation templates powered by{' '}
            <a href="https://poke.com" target="_blank" rel="noopener noreferrer" className="underline decoration-zinc-300 hover:decoration-zinc-500">Poke</a>.
            Install with one click and start automating.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((r) => (
            <div
              key={r.name}
              className="flex flex-col justify-between rounded-xl border border-zinc-200 p-5 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            >
              <div>
                <div className="mb-3 flex items-center gap-3">
                  <span className="text-3xl">{r.icon}</span>
                  <div>
                    <h3 className="text-sm font-semibold">{r.name}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${mcpColors[r.mcp]}`}>{r.mcp}</span>
                      <span className="text-[10px] text-zinc-400">{r.automations} automation{r.automations !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs leading-relaxed text-zinc-500">{r.desc}</p>
              </div>
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
              >
                Install recipe
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  return (
    <section className="border-t border-zinc-100 py-20 dark:border-zinc-800">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Up and running in 3 steps
        </h2>

        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {[
            {
              step: '1',
              title: 'Sign up with GitHub',
              desc: 'Create your account in seconds. No credit card required.',
            },
            {
              step: '2',
              title: 'Enable your MCPs',
              desc: 'Choose which AI assistants you want to activate.',
            },
            {
              step: '3',
              title: 'Connect your client',
              desc: 'Use with Claude, Cursor, or any MCP-compatible app.',
            },
          ].map((item) => (
            <div key={item.step} className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-sm font-bold text-white dark:bg-white dark:text-zinc-900">
                {item.step}
              </div>
              <h3 className="mt-4 font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="border-t border-zinc-100 py-20 dark:border-zinc-800">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <h2 className="text-3xl font-bold sm:text-4xl">Ready to start?</h2>
        <p className="mt-4 text-zinc-500">
          Set up your personal MCP hub in under a minute.
        </p>
        <div className="mt-8">
          <button
            onClick={signInWithGitHub}
            className={btnClassCta}
          >
            <GitHubIcon className="h-5 w-5" />
            Continue with GitHub
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-zinc-100 px-6 py-8 dark:border-zinc-800">
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-xs text-zinc-400">&copy; 2026 thedevhype</p>
        <div className="flex gap-6">
          <a
            href="/privacy"
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Privacy
          </a>
          <a
            href="/terms"
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            Terms
          </a>
        </div>
      </div>
    </footer>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <Header />
      <Hero />
      <OttoShowcase />
      <EloaShowcase />
      <LucianShowcase />
      <RecipesSection />
      <HowItWorks />
      <CtaSection />
      <Footer />
    </div>
  );
}
