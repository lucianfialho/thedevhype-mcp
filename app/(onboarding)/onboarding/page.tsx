import { redirect } from 'next/navigation';
import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { userProfiles, userMcpAccess } from '@/app/lib/db/public.schema';
import { eq } from 'drizzle-orm';
import { registry } from '@/app/lib/mcp/servers';
import { OnboardingWizard } from './onboarding-wizard';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const { data: session } = await auth.getSession();
  const user = session?.user;
  if (!user?.id) redirect('/');

  const [profile] = await db
    .select({ onboardingCompletedAt: userProfiles.onboardingCompletedAt })
    .from(userProfiles)
    .where(eq(userProfiles.userId, user.id));

  if (profile?.onboardingCompletedAt) redirect('/dashboard');

  const servers = registry.listServers().map((s) => ({
    name: s.name,
    description: s.description,
    icon: s.icon || null,
    badge: s.badge || null,
    tools: s.tools.map((t) => ({ name: t.name, description: t.description })),
  }));

  const existingAccess = await db
    .select({
      mcpName: userMcpAccess.mcpName,
      enabled: userMcpAccess.enabled,
      hasApiKey: userMcpAccess.apiKey,
    })
    .from(userMcpAccess)
    .where(eq(userMcpAccess.userId, user.id));

  return (
    <OnboardingWizard
      servers={servers}
      existingAccess={existingAccess.map((a) => ({
        mcpName: a.mcpName,
        enabled: a.enabled,
        hasApiKey: !!a.hasApiKey,
      }))}
    />
  );
}
