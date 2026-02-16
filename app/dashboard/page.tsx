import Link from 'next/link';
import { auth } from '@/app/lib/auth/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();
  const user = session?.user;

  return (
    <main className="mx-auto max-w-3xl px-4 py-4 sm:p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="mt-1 text-zinc-500">
          {user?.name ? `Welcome, ${user.name}.` : 'Welcome.'}
        </p>
      </div>

      <div className="space-y-3">
        <Link
          href="/dashboard/eloa"
          className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:shadow-sm sm:gap-4 sm:p-5 dark:border-zinc-800 dark:hover:border-zinc-700"
        >
          <img
            src="/eloa.png"
            alt="Eloa"
            className="h-10 w-10 shrink-0 rounded-full"
          />
          <div>
            <h3 className="text-lg font-semibold">Eloa</h3>
            <p className="text-sm text-zinc-500">AI Content Curator — RSS feeds, bookmarks e busca</p>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="ml-auto shrink-0 text-zinc-400"
          >
            <path d="M8 5l5 5-5 5" />
          </svg>
        </Link>

        <Link
          href="/dashboard/lucian"
          className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-300 hover:shadow-sm sm:gap-4 sm:p-5 dark:border-zinc-800 dark:hover:border-zinc-700"
        >
          <img
            src="/lucian.png"
            alt="Lucian"
            className="h-10 w-10 shrink-0 rounded-full"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Lucian</h3>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">Brazil only</span>
            </div>
            <p className="text-sm text-zinc-500">Virtual Grocery Manager — NFC-e receipts, price tracking & spending</p>
          </div>
          <svg
            width="20"
            height="20"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="ml-auto shrink-0 text-zinc-400"
          >
            <path d="M8 5l5 5-5 5" />
          </svg>
        </Link>
      </div>
    </main>
  );
}
