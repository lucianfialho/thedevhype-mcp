'use client';

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

function ProductMockup() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-20">
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
            <div className="h-3 w-3 rounded-full bg-zinc-200 dark:bg-zinc-700" />
          </div>
          <div className="ml-4 flex-1 rounded-md bg-zinc-100 px-3 py-1 text-xs text-zinc-400 dark:bg-zinc-800">
            thedevhype.com/dashboard
          </div>
        </div>

        {/* Fake dashboard content */}
        <div className="p-6 sm:p-8">
          <div className="mb-6">
            <div className="text-lg font-bold">Dashboard</div>
            <div className="mt-1 text-sm text-zinc-400">Welcome back.</div>
          </div>

          <div className="space-y-3">
            {/* Eloa card */}
            <div className="flex items-center gap-4 rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
              <img src="/eloa.png" alt="Eloa" className="h-12 w-12 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Eloa</div>
                <div className="text-sm text-zinc-400">AI Content Curator — RSS feeds, bookmarks & search</div>
              </div>
              <div className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                Active
              </div>
            </div>

            {/* Lucian card */}
            <div className="flex items-center gap-4 rounded-lg border border-zinc-100 p-4 dark:border-zinc-800">
              <img src="/lucian.png" alt="Lucian" className="h-12 w-12 rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Lucian</span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    🇧🇷 Brazil only
                  </span>
                </div>
                <div className="text-sm text-zinc-400">Virtual Grocery Manager — NFC-e receipts, price tracking</div>
              </div>
              <div className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                Active
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function AssistantsSection() {
  return (
    <section className="border-t border-zinc-100 py-20 dark:border-zinc-800">
      <div className="mx-auto max-w-4xl px-6">
        <h2 className="text-center text-3xl font-bold sm:text-4xl">
          Meet your assistants
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-center text-zinc-500">
          Each MCP server is a specialized AI assistant you can connect to Claude, Cursor, or any MCP-compatible client.
        </p>

        <div className="mt-14 grid gap-8 sm:grid-cols-2">
          {/* Eloa */}
          <div className="rounded-xl border border-zinc-200 p-6 transition-shadow hover:shadow-lg dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <img src="/eloa.png" alt="Eloa" className="h-16 w-16 rounded-full" />
              <div>
                <h3 className="text-xl font-bold">Eloa</h3>
                <p className="text-sm text-zinc-500">AI Content Curator</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {[
                'Curated RSS feed reader',
                'Smart bookmarks with tags',
                'Full-text content search',
                'Analytics dashboard',
                'MCP integration for Claude',
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mt-0.5 shrink-0">
                    <path d="M5 9l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500" />
                  </svg>
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Lucian */}
          <div className="rounded-xl border border-zinc-200 p-6 transition-shadow hover:shadow-lg dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <img src="/lucian.png" alt="Lucian" className="h-16 w-16 rounded-full" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">Lucian</h3>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                    🇧🇷 Brazil only
                  </span>
                </div>
                <p className="text-sm text-zinc-500">Virtual Grocery Manager</p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {[
                'Receipt extraction from NFC-e',
                'Product catalog per store',
                'Price history tracking',
                'Spending analysis by category',
                'MCP integration for Claude',
              ].map((f) => (
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
            href="https://github.com/thedevhype"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300"
          >
            GitHub
          </a>
          <span className="text-xs text-zinc-400">Privacy</span>
          <span className="text-xs text-zinc-400">Terms</span>
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
      <ProductMockup />
      <AssistantsSection />
      <HowItWorks />
      <CtaSection />
      <Footer />
    </div>
  );
}
