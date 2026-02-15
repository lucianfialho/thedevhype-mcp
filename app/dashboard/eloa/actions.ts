'use server';

import { auth } from '@/app/lib/auth/server';
import { db } from '@/app/lib/db';
import { eq, and, sql, desc, ilike, or } from 'drizzle-orm';
import { sources, articles, bookmarks } from '@/app/lib/mcp/servers/eloa.schema';
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

export async function getSources() {
  const userId = await requireUserId();
  return db
    .select()
    .from(sources)
    .where(eq(sources.userId, userId))
    .orderBy(desc(sources.createdAt));
}

export async function addSource(url: string, category?: string) {
  try {
    const userId = await requireUserId();

    const existing = await db
      .select({ count: sql<number>`count(*)` })
      .from(sources)
      .where(eq(sources.userId, userId));
    if (existing[0].count >= MAX_SOURCES) {
      return { error: `Limite de ${MAX_SOURCES} fontes atingido.` };
    }

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

    const [source] = await db.insert(sources).values({
      userId,
      url,
      title: feedTitle,
      siteUrl: feedSiteUrl,
      category: category || null,
    }).returning();

    return { data: source };
  } catch (err) {
    console.error('addSource error:', err);
    return { error: 'Erro ao adicionar fonte.' };
  }
}

export async function removeSource(sourceId: number) {
  const userId = await requireUserId();

  const [source] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, sourceId), eq(sources.userId, userId)));
  if (!source) return { error: 'Fonte nao encontrada.' };

  await db.delete(articles).where(
    and(eq(articles.sourceId, sourceId), eq(articles.userId, userId)),
  );
  await db.delete(sources).where(eq(sources.id, sourceId));

  return { data: { removed: source.title } };
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

  const sourceFilter = sourceId
    ? and(eq(sources.id, sourceId), eq(sources.userId, userId))
    : eq(sources.userId, userId);
  const userSources = await db.select().from(sources).where(sourceFilter);

  let count = 0;
  for (const source of userSources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(source.url, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      const feed = await rssParser.parseString(text);
      for (const item of feed.items || []) {
        if (!item.link) continue;
        await db
          .insert(articles)
          .values({
            userId,
            sourceId: source.id,
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
              publishedAt: sql`EXCLUDED.published_at`,
            },
          });
        count++;
      }
      await db
        .update(sources)
        .set({ lastFetchedAt: new Date().toISOString() })
        .where(eq(sources.id, source.id));
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
    if (!bookmarkTitle) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);
        const html = await res.text();
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        bookmarkTitle = match ? match[1].trim() : url;
      } catch {
        bookmarkTitle = url;
      }
    }

    const [bookmark] = await db.insert(bookmarks).values({
      userId,
      url,
      title: bookmarkTitle,
      tags: tags?.length ? tags : null,
      notes: notes || null,
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
  const pattern = `%${query}%`;
  const results: Array<{ tipo: string; id: number; title: string; url: string; snippet: string; createdAt: string | null }> = [];

  if (tipo === 'todos' || tipo === 'artigos') {
    const articleResults = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.userId, userId),
          or(ilike(articles.title, pattern), ilike(articles.content, pattern)),
        ),
      )
      .orderBy(desc(articles.createdAt))
      .limit(20);

    for (const a of articleResults) {
      const text = a.content || a.title;
      const idx = text.toLowerCase().indexOf(query.toLowerCase());
      const start = Math.max(0, idx - 50);
      const snippet = text.slice(start, start + 150);
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
      .select()
      .from(bookmarks)
      .where(
        and(
          eq(bookmarks.userId, userId),
          or(
            ilike(bookmarks.title, pattern),
            ilike(bookmarks.content, pattern),
            ilike(bookmarks.notes, pattern),
            sql`array_to_string(${bookmarks.tags}, ' ') ILIKE ${pattern}`,
          ),
        ),
      )
      .orderBy(desc(bookmarks.createdAt))
      .limit(20);

    for (const b of bookmarkResults) {
      const text = b.notes || b.content || b.title;
      const idx = text.toLowerCase().indexOf(query.toLowerCase());
      const start = Math.max(0, idx - 50);
      const snippet = text.slice(start, start + 150);
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

  // Title matches first
  results.sort((a, b) => {
    const aTitle = a.title.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
    const bTitle = b.title.toLowerCase().includes(query.toLowerCase()) ? 0 : 1;
    return aTitle - bTitle;
  });

  return results.slice(0, 20);
}
