'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, sql, desc } from 'drizzle-orm';
import { userInNeonAuth, apiKeys, apiUsageLog, userMcpAccess } from '@/app/lib/db/public.schema';

async function requireAdmin() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');

  const [user] = await db
    .select({ role: userInNeonAuth.role })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId));

  if (user?.role !== 'admin') throw new Error('Not authorized');
  return userId;
}

// ─── Users ───

export async function getUsers() {
  await requireAdmin();

  const rows = await db
    .select({
      id: userInNeonAuth.id,
      name: userInNeonAuth.name,
      email: userInNeonAuth.email,
      image: userInNeonAuth.image,
      role: userInNeonAuth.role,
      banned: userInNeonAuth.banned,
      banReason: userInNeonAuth.banReason,
      banExpires: userInNeonAuth.banExpires,
      createdAt: userInNeonAuth.createdAt,
      apiKeyCount: sql<number>`(SELECT count(*)::int FROM api_keys WHERE api_keys."userId" = "neon_auth"."user"."id")`,
      mcpCount: sql<number>`(SELECT count(*)::int FROM user_mcp_access WHERE user_mcp_access."userId" = "neon_auth"."user"."id" AND user_mcp_access.enabled = true)`,
    })
    .from(userInNeonAuth)
    .orderBy(desc(userInNeonAuth.createdAt));

  return rows;
}

export type AdminUser = Awaited<ReturnType<typeof getUsers>>[number];

// ─── API Keys ───

export async function getApiKeysAdmin() {
  await requireAdmin();

  const rows = await db
    .select({
      id: apiKeys.id,
      key: apiKeys.key,
      name: apiKeys.name,
      email: apiKeys.email,
      tier: apiKeys.tier,
      rateLimit: apiKeys.rateLimit,
      dailyLimit: apiKeys.dailyLimit,
      requestsToday: apiKeys.requestsToday,
      requestsThisHour: apiKeys.requestsThisHour,
      lastRequestAt: apiKeys.lastRequestAt,
      defaultState: apiKeys.defaultState,
      enabled: apiKeys.enabled,
      createdAt: apiKeys.createdAt,
      userId: apiKeys.userId,
    })
    .from(apiKeys)
    .orderBy(desc(apiKeys.createdAt));

  return rows;
}

export type AdminApiKey = Awaited<ReturnType<typeof getApiKeysAdmin>>[number];

// ─── API Usage Stats ───

export async function getApiUsageStats() {
  await requireAdmin();

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [todayRow, weekRow, monthRow, topEndpoints, statusBreakdown] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiUsageLog)
      .where(sql`${apiUsageLog.createdAt} >= ${todayStart.toISOString()}`)
      .then((r) => r[0]),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiUsageLog)
      .where(sql`${apiUsageLog.createdAt} >= ${sevenDaysAgo.toISOString()}`)
      .then((r) => r[0]),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(apiUsageLog)
      .where(sql`${apiUsageLog.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .then((r) => r[0]),
    db
      .select({
        endpoint: apiUsageLog.endpoint,
        method: apiUsageLog.method,
        count: sql<number>`count(*)::int`,
      })
      .from(apiUsageLog)
      .where(sql`${apiUsageLog.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .groupBy(apiUsageLog.endpoint, apiUsageLog.method)
      .orderBy(sql`count(*) DESC`)
      .limit(10),
    db
      .select({
        statusGroup: sql<string>`CASE
          WHEN ${apiUsageLog.statusCode} >= 200 AND ${apiUsageLog.statusCode} < 300 THEN '2xx'
          WHEN ${apiUsageLog.statusCode} >= 400 AND ${apiUsageLog.statusCode} < 500 THEN '4xx'
          WHEN ${apiUsageLog.statusCode} >= 500 THEN '5xx'
          ELSE 'other'
        END`,
        count: sql<number>`count(*)::int`,
      })
      .from(apiUsageLog)
      .where(sql`${apiUsageLog.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .groupBy(sql`1`)
      .orderBy(sql`1`),
  ]);

  return {
    today: todayRow.count,
    week: weekRow.count,
    month: monthRow.count,
    topEndpoints,
    statusBreakdown,
  };
}

export type ApiUsageStats = Awaited<ReturnType<typeof getApiUsageStats>>;

// ─── Mutations ───

export async function banUser(userId: string, reason: string) {
  await requireAdmin();

  await db
    .update(userInNeonAuth)
    .set({ banned: true, banReason: reason })
    .where(eq(userInNeonAuth.id, userId));

  return { success: true };
}

export async function unbanUser(userId: string) {
  await requireAdmin();

  await db
    .update(userInNeonAuth)
    .set({ banned: false, banReason: null, banExpires: null })
    .where(eq(userInNeonAuth.id, userId));

  return { success: true };
}

export async function setUserRole(userId: string, role: string | null) {
  await requireAdmin();

  await db
    .update(userInNeonAuth)
    .set({ role })
    .where(eq(userInNeonAuth.id, userId));

  return { success: true };
}

export async function toggleApiKeyEnabled(keyId: number, enabled: boolean) {
  await requireAdmin();

  await db
    .update(apiKeys)
    .set({ enabled })
    .where(eq(apiKeys.id, keyId));

  return { success: true };
}
