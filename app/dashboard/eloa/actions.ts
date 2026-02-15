'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, and, sql, desc } from 'drizzle-orm';
import { sources, userSources, articles, bookmarks } from '@/app/lib/mcp/servers/eloa.schema';
import type { SourceWithSubscription } from '@/app/lib/mcp/servers/eloa.schema';
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

  const rows = await db
    .select({
      id: sources.id,
      url: sources.url,
      title: sources.title,
      siteUrl: sources.siteUrl,
      lastFetchedAt: sources.lastFetchedAt,
      createdAt: sources.createdAt,
      category: userSources.category,
      subscriberCount: sql<number>`(SELECT count(*)::int FROM mcp_eloa.user_sources WHERE "sourceId" = ${sources.id})`,
    })
    .from(userSources)
    .innerJoin(sources, eq(userSources.sourceId, sources.id))
    .where(eq(userSources.userId, userId))
    .orderBy(desc(sources.createdAt));

  return rows;
}

export async function addSource(url: string, category?: string): Promise<{ data?: SourceWithSubscription; error?: string }> {
  try {
    const userId = await requireUserId();

    // Check subscription limit
    const existing = await db
      .select({ count: sql<number>`count(*)` })
      .from(userSources)
      .where(eq(userSources.userId, userId));
    if (existing[0].count >= MAX_SOURCES) {
      return { error: `Limite de ${MAX_SOURCES} fontes atingido.` };
    }

    // Check if source already exists by URL
    let [source] = await db
      .select()
      .from(sources)
      .where(eq(sources.url, url));

    if (!source) {
      // Validate and parse feed
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

    // Create subscription (ignore if already exists)
    await db.insert(userSources).values({
      userId,
      sourceId: source.id,
      category: category || null,
    }).onConflictDoNothing();

    // Get subscriber count
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

  // Verify subscription exists
  const [subscription] = await db
    .select()
    .from(userSources)
    .where(and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId)));
  if (!subscription) return { error: 'Fonte nao encontrada.' };

  // Get source title for response
  const [source] = await db
    .select()
    .from(sources)
    .where(eq(sources.id, sourceId));

  // Delete user's articles for this source
  await db.delete(articles).where(
    and(eq(articles.sourceId, sourceId), eq(articles.userId, userId)),
  );

  // Delete subscription
  await db.delete(userSources).where(
    and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId)),
  );

  // If no subscribers left, delete the source
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

export async function getArticles(sourceId?: number, page = 0, limit = 20) {
  const userId = await requireUserId();

  const conditions = sourceId
    ? and(eq(articles.userId, userId), eq(articles.sourceId, sourceId))
    : eq(articles.userId, userId);

  return db
    .select({
      id: articles.id,
      title: articles.title,
      url: articles.url,
      author: articles.author,
      content: articles.content,
      publishedAt: articles.publishedAt,
      createdAt: articles.createdAt,
      sourceId: articles.sourceId,
    })
    .from(articles)
    .where(conditions)
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(page * limit);
}

export async function refreshFeeds(sourceId?: number) {
  const userId = await requireUserId();

  // Get sources the user is subscribed to
  const sourceFilter = sourceId
    ? and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId))
    : eq(userSources.userId, userId);

  const subscriptions = await db
    .select({ sourceId: sources.id, url: sources.url })
    .from(userSources)
    .innerJoin(sources, eq(userSources.sourceId, sources.id))
    .where(sourceFilter);

  let count = 0;
  for (const sub of subscriptions) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(sub.url, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      const feed = await rssParser.parseString(text);
      for (const item of feed.items || []) {
        if (!item.link) continue;
        await db
          .insert(articles)
          .values({
            userId,
            sourceId: sub.sourceId,
            title: item.title || 'Sem titulo',
            url: item.link,
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

  const conditions = tag
    ? and(eq(bookmarks.userId, userId), sql`${tag} = ANY(${bookmarks.tags})`)
    : eq(bookmarks.userId, userId);

  return db
    .select()
    .from(bookmarks)
    .where(conditions)
    .orderBy(desc(bookmarks.createdAt))
    .limit(limit)
    .offset(page * limit);
}

export async function addBookmark(url: string, title?: string, tags?: string[], notes?: string) {
  try {
    const userId = await requireUserId();

    let bookmarkTitle = title || '';
    let content = '';
    let summary = '';

    // Always fetch HTML to extract content for FTS
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

    const [bookmark] = await db.insert(bookmarks).values({
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

    return { data: bookmark };
  } catch (err) {
    console.error('addBookmark error:', err);
    return { error: 'Erro ao salvar bookmark.' };
  }
}

export async function removeBookmark(bookmarkId: number) {
  const userId = await requireUserId();

  const [bookmark] = await db
    .select()
    .from(bookmarks)
    .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
  if (!bookmark) return { error: 'Bookmark nao encontrado.' };

  await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));

  return { data: { removed: bookmark.title } };
}

export async function getAllTags() {
  const userId = await requireUserId();

  const result = await db.execute<{ tag: string }>(
    sql`SELECT DISTINCT unnest(tags) as tag FROM mcp_eloa.bookmarks WHERE "userId" = ${userId} ORDER BY tag`,
  );

  return result.rows.map((r) => r.tag);
}

// ─── Search ───

export async function searchContent(query: string, tipo: 'artigos' | 'bookmarks' | 'todos' = 'todos') {
  const userId = await requireUserId();
  const results: Array<{ tipo: string; id: number; title: string; url: string; snippet: string; createdAt: string | null }> = [];

  try {
    const tsquery = sql`websearch_to_tsquery('simple', ${query})`;

    if (tipo === 'todos' || tipo === 'artigos') {
      const articleResults = await db
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
      const bookmarkResults = await db
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
}
