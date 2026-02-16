import Link from 'next/link';
import { UserButton } from '@neondatabase/neon-js/auth/react/ui';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-zinc-200 px-4 sm:h-16 sm:px-6 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <img src="/logo.png" alt="thedevhype" className="h-7 w-7 sm:h-8 sm:w-8" />
          <span className="text-lg font-bold">thedevhype</span>
        </Link>
        <UserButton size="icon" />
      </header>
      {children}
    </>
  );
}
