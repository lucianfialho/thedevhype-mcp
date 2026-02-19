import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import Landing from './landing';

export default async function Home() {
  const { data: session } = await auth.getSession();

  if (session?.user?.id) {
    redirect('/dashboard');
  }

  return <Landing />;
}
