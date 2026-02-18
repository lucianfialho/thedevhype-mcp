import Link from 'next/link';

export default function WaitlistLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <header className="flex items-center justify-between px-6 py-5 sm:px-10">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="thedevhype" className="h-7 w-7" />
          <span className="text-lg font-bold">thedevhype</span>
        </Link>
      </header>

      <main className="mx-auto max-w-xl px-6 py-12 sm:py-20">
        {children}
      </main>

      <footer className="border-t border-zinc-100 px-6 py-8 dark:border-zinc-800">
        <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-xs text-zinc-400">&copy; 2026 thedevhype</p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300">Privacy</a>
            <a href="/terms" className="text-xs text-zinc-400 transition-colors hover:text-zinc-600 dark:hover:text-zinc-300">Terms</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
