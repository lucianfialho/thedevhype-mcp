'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, sql, desc, gte } from 'drizzle-orm';
import { userInNeonAuth, apiKeys, apiUsageLog, userMcpAccess, mcpToolUsage } from '@/app/lib/db/public.schema';
import { articles, linkClicks } from '@/app/lib/mcp/servers/eloa.schema';

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

  return db
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
}

export async function getUserMcpAccess() {
  await requireAdmin();

  return db
    .select({
      userId: userMcpAccess.userId,
      mcpName: userMcpAccess.mcpName,
      enabled: userMcpAccess.enabled,
    })
    .from(userMcpAccess)
    .where(eq(userMcpAccess.enabled, true));
}

export type AdminUser = Awaited<ReturnType<typeof getUsers>>[number];
export type UserMcpAccessRow = Awaited<ReturnType<typeof getUserMcpAccess>>[number];

// ─── API Keys ───

export async function getApiKeysAdmin() {
  await requireAdmin();

  return db
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

// ─── MCP Usage Stats ───

export async function getMcpUsageStats() {
  await requireAdmin();

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [totalCalls, byUser, byTool, recentErrors] = await Promise.all([
    db
      .select({
        today: sql<number>`count(*) FILTER (WHERE ${mcpToolUsage.createdAt} >= ${new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()})::int`,
        week: sql<number>`count(*) FILTER (WHERE ${mcpToolUsage.createdAt} >= ${sevenDaysAgo.toISOString()})::int`,
        month: sql<number>`count(*) FILTER (WHERE ${mcpToolUsage.createdAt} >= ${thirtyDaysAgo.toISOString()})::int`,
      })
      .from(mcpToolUsage)
      .then((r) => r[0]),
    db
      .select({
        userName: userInNeonAuth.name,
        mcpName: mcpToolUsage.mcpName,
        count: sql<number>`count(*)::int`,
      })
      .from(mcpToolUsage)
      .innerJoin(userInNeonAuth, eq(mcpToolUsage.userId, userInNeonAuth.id))
      .where(sql`${mcpToolUsage.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .groupBy(userInNeonAuth.name, mcpToolUsage.mcpName)
      .orderBy(sql`count(*) DESC`),
    db
      .select({
        mcpName: mcpToolUsage.mcpName,
        toolName: mcpToolUsage.toolName,
        count: sql<number>`count(*)::int`,
        avgDuration: sql<number>`COALESCE(avg("durationMs"), 0)::int`,
      })
      .from(mcpToolUsage)
      .where(sql`${mcpToolUsage.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .groupBy(mcpToolUsage.mcpName, mcpToolUsage.toolName)
      .orderBy(sql`count(*) DESC`),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(mcpToolUsage)
      .where(sql`${mcpToolUsage.error} = true AND ${mcpToolUsage.createdAt} >= ${thirtyDaysAgo.toISOString()}`)
      .then((r) => r[0]),
  ]);

  return {
    totalCalls,
    byUser,
    byTool,
    errors: recentErrors.count,
  };
}

export type McpUsageStats = Awaited<ReturnType<typeof getMcpUsageStats>>;

// ─── Mutations ───

export async function banUser(targetUserId: string, reason: string) {
  await requireAdmin();

  await db
    .update(userInNeonAuth)
    .set({ banned: true, banReason: reason })
    .where(eq(userInNeonAuth.id, targetUserId));
  return { success: true };
}

export async function unbanUser(targetUserId: string) {
  await requireAdmin();

  await db
    .update(userInNeonAuth)
    .set({ banned: false, banReason: null, banExpires: null })
    .where(eq(userInNeonAuth.id, targetUserId));
  return { success: true };
}

export async function setUserRole(targetUserId: string, role: string | null) {
  await requireAdmin();

  await db
    .update(userInNeonAuth)
    .set({ role })
    .where(eq(userInNeonAuth.id, targetUserId));
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

// ─── Click Analytics (global) ───

export async function getClickStats() {
  await requireAdmin();

  const [totalRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(linkClicks);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [todayRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(linkClicks)
    .where(gte(linkClicks.clickedAt, todayStart.toISOString()));

  return {
    totalClicks: totalRow.count,
    todayClicks: todayRow.count,
  };
}

export async function getTopClickedArticles(limit = 10, period: 'today' | '7d' | '30d' | 'all' = 'all') {
  await requireAdmin();

  let dateFilter = sql`1=1`;
  if (period !== 'all') {
    const now = new Date();
    if (period === 'today') {
      now.setHours(0, 0, 0, 0);
    } else if (period === '7d') {
      now.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      now.setDate(now.getDate() - 30);
    }
    dateFilter = gte(linkClicks.clickedAt, now.toISOString());
  }

  return db
    .select({
      articleId: articles.id,
      title: articles.title,
      url: articles.url,
      shortCode: articles.shortCode,
      sourceTitle: sql<string>`(SELECT title FROM mcp_eloa.sources WHERE id = ${articles.sourceId})`,
      clickCount: sql<number>`count(*)::int`,
      lastClickedAt: sql<string>`max(${linkClicks.clickedAt})`,
    })
    .from(linkClicks)
    .innerJoin(articles, eq(linkClicks.articleId, articles.id))
    .where(dateFilter)
    .groupBy(articles.id)
    .orderBy(sql`count(*) DESC`)
    .limit(limit);
}

export async function getClicksBySource(period: 'today' | '7d' | '30d' | 'all' = 'all') {
  await requireAdmin();

  let dateFilter = sql`1=1`;
  if (period !== 'all') {
    const now = new Date();
    if (period === 'today') {
      now.setHours(0, 0, 0, 0);
    } else if (period === '7d') {
      now.setDate(now.getDate() - 7);
    } else if (period === '30d') {
      now.setDate(now.getDate() - 30);
    }
    dateFilter = gte(linkClicks.clickedAt, now.toISOString());
  }

  return db
    .select({
      sourceTitle: sql<string>`(SELECT title FROM mcp_eloa.sources WHERE id = ${articles.sourceId})`,
      clickCount: sql<number>`count(*)::int`,
    })
    .from(linkClicks)
    .innerJoin(articles, eq(linkClicks.articleId, articles.id))
    .where(dateFilter)
    .groupBy(articles.sourceId)
    .orderBy(sql`count(*) DESC`);
}

export async function getClicksOverTime(days = 14) {
  await requireAdmin();

  const since = new Date();
  since.setDate(since.getDate() - days);

  return db
    .select({
      date: sql<string>`date_trunc('day', ${linkClicks.clickedAt})::date::text`,
      count: sql<number>`count(*)::int`,
    })
    .from(linkClicks)
    .where(gte(linkClicks.clickedAt, since.toISOString()))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
}
