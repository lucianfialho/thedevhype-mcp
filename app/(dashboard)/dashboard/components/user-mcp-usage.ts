'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, and, sql } from 'drizzle-orm';
import { mcpToolUsage } from '@/app/lib/db/public.schema';

async function requireUserId() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

export interface UserMcpUsageStats {
  totalCalls: { today: number; week: number; month: number };
  byTool: Array<{ toolName: string; count: number; avgDuration: number }>;
  errors: number;
}

export async function getUserMcpUsage(mcpName: string): Promise<UserMcpUsageStats> {
  const userId = await requireUserId();

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const baseFilter = and(eq(mcpToolUsage.userId, userId), eq(mcpToolUsage.mcpName, mcpName));

  const [totalCalls, byTool, errorsRow] = await Promise.all([
    db
      .select({
        today: sql<number>`count(*) FILTER (WHERE ${mcpToolUsage.createdAt} >= ${todayStart.toISOString()})::int`,
        week: sql<number>`count(*) FILTER (WHERE ${mcpToolUsage.createdAt} >= ${sevenDaysAgo.toISOString()})::int`,
        month: sql<number>`count(*) FILTER (WHERE ${mcpToolUsage.createdAt} >= ${thirtyDaysAgo.toISOString()})::int`,
      })
      .from(mcpToolUsage)
      .where(baseFilter)
      .then((r) => r[0]),
    db
      .select({
        toolName: mcpToolUsage.toolName,
        count: sql<number>`count(*)::int`,
        avgDuration: sql<number>`COALESCE(avg("durationMs"), 0)::int`,
      })
      .from(mcpToolUsage)
      .where(and(baseFilter, sql`${mcpToolUsage.createdAt} >= ${thirtyDaysAgo.toISOString()}`))
      .groupBy(mcpToolUsage.toolName)
      .orderBy(sql`count(*) DESC`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(mcpToolUsage)
      .where(and(baseFilter, sql`${mcpToolUsage.error} = true AND ${mcpToolUsage.createdAt} >= ${thirtyDaysAgo.toISOString()}`))
      .then((r) => r[0]),
  ]);

  return {
    totalCalls,
    byTool,
    errors: errorsRow.count,
  };
}
