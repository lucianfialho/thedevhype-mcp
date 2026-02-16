import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import Landing from './landing';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const { data: session } = await auth.getSession();
  if (session?.user) redirect('/dashboard');
  return <Landing />;
}
