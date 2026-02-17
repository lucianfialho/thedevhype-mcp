'use server';

import { auth } from '@/app/lib/auth/server';
import { db, withRLS } from '@/app/lib/db';
import { eq, and, sql, desc, inArray, gte } from 'drizzle-orm';
import { sources, userSources, articles, bookmarks, linkClicks } from '@/app/lib/mcp/servers/eloa.schema';
import type { SourceWithSubscription } from '@/app/lib/mcp/servers/eloa.schema';
import { userInNeonAuth } from '@/app/lib/db/public.schema';
import { generateShortCode } from '@/app/lib/short-code';
import RssParser from 'rss-parser';

const MAX_SOURCES = 20;
const rssParser = new RssParser();

async function requireUserId() {
  const { data: session } = await auth.getSession();
  const userId = session?.user?.id;
  if (!userId) throw new Error('Not authenticated');
  return userId;
}

// ─── Sources ───

export async function getSources(): Promise<SourceWithSubscription[]> {
  const userId = await requireUserId();

  const rows = await withRLS(userId, async (tx) => {
    return tx
      .select({
        id: sources.id,
        url: sources.url,
        title: sources.title,
        siteUrl: sources.siteUrl,
        lastFetchedAt: sources.lastFetchedAt,
        createdAt: sources.createdAt,
        category: userSources.category,
      })
      .from(userSources)
      .innerJoin(sources, eq(userSources.sourceId, sources.id))
      .where(eq(userSources.userId, userId))
      .orderBy(desc(sources.createdAt));
  });

  if (rows.length === 0) return [];

  // Subscriber counts need cross-user visibility, use db (IS NULL fallback)
  const sourceIds = rows.map((r) => r.id);
  const counts = await db
    .select({
      sourceId: userSources.sourceId,
      count: sql<number>`count(*)::int`,
    })
    .from(userSources)
    .where(inArray(userSources.sourceId, sourceIds))
    .groupBy(userSources.sourceId);

  const countMap = new Map(counts.map((c) => [c.sourceId, c.count]));

  return rows.map((r) => ({
    ...r,
    subscriberCount: countMap.get(r.id) || 0,
  }));
}

export async function addSource(url: string, category?: string): Promise<{ data?: SourceWithSubscription; error?: string }> {
  try {
    const userId = await requireUserId();

    // Check subscription limit
    const existing = await withRLS(userId, async (tx) => {
      return tx
        .select({ count: sql<number>`count(*)` })
        .from(userSources)
        .where(eq(userSources.userId, userId));
    });
    if (existing[0].count >= MAX_SOURCES) {
      return { error: `Limite de ${MAX_SOURCES} fontes atingido.` };
    }

    // Check if source already exists by URL (sources is shared, no RLS)
    let [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.url, url));

    if (!source) {
      // Validate and parse feed (HTTP fetch outside RLS)
      let feedTitle = url;
      let feedSiteUrl: string | null = null;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const text = await res.text();
        const feed = await rssParser.parseString(text);
        feedTitle = feed.title || url;
        feedSiteUrl = feed.link || null;
      } catch {
        return { error: 'URL nao e um feed RSS/Atom valido ou demorou demais.' };
      }

      [source] = await db.insert(sources).values({
        url,
        title: feedTitle,
        siteUrl: feedSiteUrl,
      }).returning();
    }

    // Create subscription inside RLS
    await withRLS(userId, async (tx) => {
      await tx.insert(userSources).values({
        userId,
        sourceId: source.id,
        category: category || null,
      }).onConflictDoNothing();
    });

    // Subscriber count (cross-user, use db)
    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(userSources)
      .where(eq(userSources.sourceId, source.id));

    return {
      data: {
        id: source.id,
        url: source.url,
        title: source.title,
        siteUrl: source.siteUrl,
        lastFetchedAt: source.lastFetchedAt,
        createdAt: source.createdAt,
        category: category || null,
        subscriberCount: countRow.count,
      },
    };
  } catch (err) {
    console.error('addSource error:', err);
    return { error: 'Erro ao adicionar fonte.' };
  }
}

export async function removeSource(sourceId: number) {
  const userId = await requireUserId();

  const result = await withRLS(userId, async (tx) => {
    // Verify subscription exists
    const [subscription] = await tx
      .select()
      .from(userSources)
      .where(and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId)));
    if (!subscription) return null;

    // Delete user's articles for this source
    await tx.delete(articles).where(
      and(eq(articles.sourceId, sourceId), eq(articles.userId, userId)),
    );

    // Delete subscription
    await tx.delete(userSources).where(
      and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId)),
    );

    return true;
  });

  if (!result) return { error: 'Fonte nao encontrada.' };

  // Get source title (shared table, no RLS)
  const [source] = await db
    .select({ title: sources.title })
    .from(sources)
    .where(eq(sources.id, sourceId));

  // Check remaining subscribers across all users (cross-user, use db)
  const [remaining] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(userSources)
    .where(eq(userSources.sourceId, sourceId));

  if (remaining.count === 0) {
    await db.delete(sources).where(eq(sources.id, sourceId));
  }

  return { data: { removed: source?.title || 'Fonte' } };
}

// ─── Articles ───

export async function getArticles(sourceId?: number, page = 0, limit = 20, filter: 'all' | 'unread' | 'read' = 'all') {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const conditions = [eq(articles.userId, userId)];
    if (sourceId) conditions.push(eq(articles.sourceId, sourceId));
    if (filter === 'unread') conditions.push(eq(articles.isRead, false));
    if (filter === 'read') conditions.push(eq(articles.isRead, true));

    return tx
      .select({
        id: articles.id,
        title: articles.title,
        url: articles.url,
        shortCode: articles.shortCode,
        author: articles.author,
        content: articles.content,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
        sourceId: articles.sourceId,
        isRead: articles.isRead,
        readAt: articles.readAt,
      })
      .from(articles)
      .where(and(...conditions))
      .orderBy(desc(articles.publishedAt))
      .limit(limit)
      .offset(page * limit);
  });
}

export async function markArticleRead(articleId: number, isRead: boolean) {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    await tx
      .update(articles)
      .set({
        isRead,
        readAt: isRead ? new Date().toISOString() : null,
      })
      .where(and(eq(articles.id, articleId), eq(articles.userId, userId)));
  });
}

export async function markAllRead(sourceId?: number) {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const conditions = [eq(articles.userId, userId), eq(articles.isRead, false)];
    if (sourceId) conditions.push(eq(articles.sourceId, sourceId));

    await tx
      .update(articles)
      .set({
        isRead: true,
        readAt: new Date().toISOString(),
      })
      .where(and(...conditions));
  });
}

export async function getUnreadCount() {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const [row] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(articles)
      .where(and(eq(articles.userId, userId), eq(articles.isRead, false)));

    return row.count;
  });
}

export async function refreshFeeds(sourceId?: number) {
  const userId = await requireUserId();

  // Get subscriptions inside RLS
  const subscriptions = await withRLS(userId, async (tx) => {
    const sourceFilter = sourceId
      ? and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId))
      : eq(userSources.userId, userId);

    return tx
      .select({ sourceId: sources.id, url: sources.url })
      .from(userSources)
      .innerJoin(sources, eq(userSources.sourceId, sources.id))
      .where(sourceFilter);
  });

  let count = 0;
  for (const sub of subscriptions) {
    try {
      // HTTP fetch outside RLS
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(sub.url, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      const feed = await rssParser.parseString(text);

      // Insert articles inside RLS
      await withRLS(userId, async (tx) => {
        for (const item of feed.items || []) {
          if (!item.link) continue;
          await tx
            .insert(articles)
            .values({
              userId,
              sourceId: sub.sourceId,
              title: item.title || 'Sem titulo',
              url: item.link,
              shortCode: generateShortCode(),
              author: item.creator || item.author || null,
              content: item.contentSnippet || item.content || '',
              publishedAt: item.isoDate || null,
            })
            .onConflictDoUpdate({
              target: [articles.userId, articles.url],
              set: {
                title: sql`EXCLUDED.title`,
                content: sql`EXCLUDED.content`,
                author: sql`EXCLUDED.author`,
                publishedAt: sql`EXCLUDED."publishedAt"`,
              },
            });
          count++;
        }
      });

      // Update source lastFetchedAt (shared table, no RLS)
      await db
        .update(sources)
        .set({ lastFetchedAt: new Date().toISOString() })
        .where(eq(sources.id, sub.sourceId));
    } catch {
      // Skip failed feeds
    }
  }

  return { count };
}

// ─── Bookmarks ───

export async function getBookmarks(tag?: string, page = 0, limit = 20) {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const conditions = tag
      ? and(eq(bookmarks.userId, userId), sql`${tag} = ANY(${bookmarks.tags})`)
      : eq(bookmarks.userId, userId);

    return tx
      .select()
      .from(bookmarks)
      .where(conditions)
      .orderBy(desc(bookmarks.createdAt))
      .limit(limit)
      .offset(page * limit);
  });
}

export async function addBookmark(url: string, title?: string, tags?: string[], notes?: string) {
  try {
    const userId = await requireUserId();

    let bookmarkTitle = title || '';
    let content = '';
    let summary = '';

    // Fetch HTML outside RLS
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const html = await res.text();

      if (!bookmarkTitle) {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        bookmarkTitle = titleMatch ? titleMatch[1].trim() : url;
      }

      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
      summary = descMatch ? descMatch[1].trim() : '';

      content = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 10000);
    } catch {
      if (!bookmarkTitle) bookmarkTitle = url;
    }

    // Insert bookmark inside RLS
    const [bookmark] = await withRLS(userId, async (tx) => {
      return tx.insert(bookmarks).values({
        userId,
        url,
        title: bookmarkTitle,
        content: content || null,
        summary: summary || null,
        tags: tags?.length ? tags : null,
        notes: notes || null,
      }).onConflictDoUpdate({
        target: [bookmarks.userId, bookmarks.url],
        set: {
          title: sql`EXCLUDED.title`,
          content: sql`EXCLUDED.content`,
          summary: sql`EXCLUDED.summary`,
          tags: sql`EXCLUDED.tags`,
          notes: sql`EXCLUDED.notes`,
        },
      }).returning();
    });

    return { data: bookmark };
  } catch (err) {
    console.error('addBookmark error:', err);
    return { error: 'Erro ao salvar bookmark.' };
  }
}

export async function removeBookmark(bookmarkId: number) {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const [bookmark] = await tx
      .select()
      .from(bookmarks)
      .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
    if (!bookmark) return { error: 'Bookmark nao encontrado.' };

    await tx.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));

    return { data: { removed: bookmark.title } };
  });
}

export async function getAllTags() {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const result = await tx.execute<{ tag: string }>(
      sql`SELECT DISTINCT unnest(tags) as tag FROM mcp_eloa.bookmarks WHERE "userId" = ${userId} ORDER BY tag`,
    );

    return result.rows.map((r) => r.tag);
  });
}

// ─── Analytics ───

export async function getArticleClickCounts(articleIds: number[]) {
  if (articleIds.length === 0) return {};

  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const rows = await tx
      .select({
        articleId: linkClicks.articleId,
        count: sql<number>`count(*)::int`,
      })
      .from(linkClicks)
      .innerJoin(articles, eq(linkClicks.articleId, articles.id))
      .where(and(inArray(linkClicks.articleId, articleIds), eq(articles.userId, userId)))
      .groupBy(linkClicks.articleId);

    const map: Record<number, number> = {};
    for (const row of rows) {
      map[row.articleId] = row.count;
    }
    return map;
  });
}

export async function getClickStats() {
  const userId = await requireUserId();

  // Check admin status outside RLS
  const [user] = await db
    .select({ role: userInNeonAuth.role })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId));
  const isAdmin = user?.role === 'admin';

  return withRLS(userId, async (tx) => {
    const userFilter = isAdmin ? sql`1=1` : eq(articles.userId, userId);

    const [totalRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(linkClicks)
      .innerJoin(articles, eq(linkClicks.articleId, articles.id))
      .where(userFilter);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayRow] = await tx
      .select({ count: sql<number>`count(*)::int` })
      .from(linkClicks)
      .innerJoin(articles, eq(linkClicks.articleId, articles.id))
      .where(and(userFilter, gte(linkClicks.clickedAt, todayStart.toISOString())));

    return {
      totalClicks: totalRow.count,
      todayClicks: todayRow.count,
      isAdmin,
    };
  }, { isAdmin });
}

export async function getTopClickedArticles(limit = 10, period: 'today' | '7d' | '30d' | 'all' = 'all') {
  const userId = await requireUserId();

  // Check admin status outside RLS
  const [user] = await db
    .select({ role: userInNeonAuth.role })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId));
  const isAdmin = user?.role === 'admin';

  return withRLS(userId, async (tx) => {
    const userFilter = isAdmin ? sql`1=1` : eq(articles.userId, userId);

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

    return tx
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
      .where(and(userFilter, dateFilter))
      .groupBy(articles.id)
      .orderBy(sql`count(*) DESC`)
      .limit(limit);
  }, { isAdmin });
}

export async function getClicksBySource(period: 'today' | '7d' | '30d' | 'all' = 'all') {
  const userId = await requireUserId();

  // Check admin status outside RLS
  const [user] = await db
    .select({ role: userInNeonAuth.role })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId));
  const isAdmin = user?.role === 'admin';

  return withRLS(userId, async (tx) => {
    const userFilter = isAdmin ? sql`1=1` : eq(articles.userId, userId);

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

    return tx
      .select({
        sourceTitle: sql<string>`(SELECT title FROM mcp_eloa.sources WHERE id = ${articles.sourceId})`,
        clickCount: sql<number>`count(*)::int`,
      })
      .from(linkClicks)
      .innerJoin(articles, eq(linkClicks.articleId, articles.id))
      .where(and(userFilter, dateFilter))
      .groupBy(articles.sourceId)
      .orderBy(sql`count(*) DESC`);
  }, { isAdmin });
}

export async function getClicksOverTime(days = 14) {
  const userId = await requireUserId();

  // Check admin status outside RLS
  const [user] = await db
    .select({ role: userInNeonAuth.role })
    .from(userInNeonAuth)
    .where(eq(userInNeonAuth.id, userId));
  const isAdmin = user?.role === 'admin';

  return withRLS(userId, async (tx) => {
    const userFilter = isAdmin ? sql`1=1` : eq(articles.userId, userId);

    const since = new Date();
    since.setDate(since.getDate() - days);

    return tx
      .select({
        date: sql<string>`date_trunc('day', ${linkClicks.clickedAt})::date::text`,
        count: sql<number>`count(*)::int`,
      })
      .from(linkClicks)
      .innerJoin(articles, eq(linkClicks.articleId, articles.id))
      .where(and(userFilter, gte(linkClicks.clickedAt, since.toISOString())))
      .groupBy(sql`1`)
      .orderBy(sql`1`);
  }, { isAdmin });
}

// ─── Search ───

export async function searchContent(query: string, tipo: 'artigos' | 'bookmarks' | 'todos' = 'todos') {
  const userId = await requireUserId();

  return withRLS(userId, async (tx) => {
    const results: Array<{ tipo: string; id: number; title: string; url: string; snippet: string; createdAt: string | null }> = [];

    try {
      const tsquery = sql`websearch_to_tsquery('simple', ${query})`;

      if (tipo === 'todos' || tipo === 'artigos') {
        const articleResults = await tx
          .select({
            id: articles.id,
            title: articles.title,
            url: articles.url,
            content: articles.content,
            createdAt: articles.createdAt,
            rank: sql<number>`ts_rank(search_vector, ${tsquery})`.as('rank'),
          })
          .from(articles)
          .where(
            and(
              eq(articles.userId, userId),
              sql`search_vector @@ ${tsquery}`,
            ),
          )
          .orderBy(sql`rank DESC`)
          .limit(20);

        for (const a of articleResults) {
          const text = a.content || a.title;
          const snippet = text.slice(0, 150);
          results.push({
            tipo: 'artigo',
            id: a.id,
            title: a.title,
            url: a.url,
            snippet: snippet + (snippet.length < text.length ? '...' : ''),
            createdAt: a.createdAt,
          });
        }
      }

      if (tipo === 'todos' || tipo === 'bookmarks') {
        const bookmarkResults = await tx
          .select({
            id: bookmarks.id,
            title: bookmarks.title,
            url: bookmarks.url,
            content: bookmarks.content,
            notes: bookmarks.notes,
            createdAt: bookmarks.createdAt,
            rank: sql<number>`ts_rank(search_vector, ${tsquery})`.as('rank'),
          })
          .from(bookmarks)
          .where(
            and(
              eq(bookmarks.userId, userId),
              sql`search_vector @@ ${tsquery}`,
            ),
          )
          .orderBy(sql`rank DESC`)
          .limit(20);

        for (const b of bookmarkResults) {
          const text = b.notes || b.content || b.title;
          const snippet = text.slice(0, 150);
          results.push({
            tipo: 'bookmark',
            id: b.id,
            title: b.title,
            url: b.url,
            snippet: snippet + (snippet.length < text.length ? '...' : ''),
            createdAt: b.createdAt,
          });
        }
      }
    } catch {
      return [];
    }

    return results.slice(0, 20);
  });
}
