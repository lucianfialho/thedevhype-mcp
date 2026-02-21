import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { mcpToolUsage } from '@/app/lib/db/public.schema';
import { eq, asc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { data: session } = await auth.getSession().catch(() => ({ data: null }));
    const userId = session?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const [firstCall] = await db
      .select({
        mcpName: mcpToolUsage.mcpName,
        toolName: mcpToolUsage.toolName,
        createdAt: mcpToolUsage.createdAt,
      })
      .from(mcpToolUsage)
      .where(eq(mcpToolUsage.userId, userId))
      .orderBy(asc(mcpToolUsage.createdAt))
      .limit(1);

    if (firstCall) {
      return NextResponse.json({
        connected: true,
        firstCallAt: firstCall.createdAt,
        mcpName: firstCall.mcpName,
        toolName: firstCall.toolName,
      });
    }

    return NextResponse.json({ connected: false });
  } catch (error) {
    console.error('Error verifying onboarding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
