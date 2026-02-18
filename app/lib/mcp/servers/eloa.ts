import { z } from 'zod';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import RssParser from 'rss-parser';
import { db } from '../../db';
import { getUserId } from '../auth-helpers';
import { sources, userSources, articles, bookmarks, linkClicks } from './eloa.schema';
import { generateShortCode } from '../../short-code';
import type { McpServerDefinition } from '../types';

const MAX_SOURCES = 20;
const rssParser = new RssParser();

export const eloaServer: McpServerDefinition = {
  name: 'eloa',
  description:
    'Eloa — AI Content Curator: manage RSS sources, bookmarks and search across all your saved content',
  category: 'Content Tools',
  icon: '/eloa.png',
  tools: [
    {
      name: 'add_source',
      description: 'Add an RSS/Atom source by validating the feed and auto-extracting the title',
    },
    {
      name: 'list_sources',
      description: 'List all registered RSS sources',
    },
    {
      name: 'remove_source',
      description: 'Remove an RSS source and its associated articles',
    },
    {
      name: 'fetch_latest',
      description: 'Fetch latest articles from all sources or a specific source',
    },
    {
      name: 'save_bookmark',
      description: 'Save a URL as a bookmark with tags and notes',
    },
    {
      name: 'list_bookmarks',
      description: 'List saved bookmarks with optional tag filter',
    },
    {
      name: 'remove_bookmark',
      description: 'Remove a bookmark by ID',
    },
    {
      name: 'mark_as_read',
      description: 'Mark an article as read or unread',
    },
    {
      name: 'search_content',
      description: 'Search all saved content (articles + bookmarks) by keyword',
    },
    {
      name: 'extract_content',
      description: 'Extract full content from a URL via scrape API or direct fetch',
    },
    {
      name: 'view_analytics',
      description: 'Show article click analytics with ranking and clicks by source',
    },
  ],
  init: (server) => {
    // ─── add_source ───
    server.tool(
      'add_source',
      'Add an RSS/Atom source. Validates the feed, extracts the title and saves it. Limit of 20 sources per user.',
      {
        url: z.string().url().describe('RSS/Atom feed URL'),
        category: z.string().optional().describe('Source category (e.g. tech, design, news)'),
      },
      async ({ url, category }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Check subscription limit
        const existing = await db
          .select({ count: sql<number>`count(*)` })
          .from(userSources)
          .where(eq(userSources.userId, userId));
        if (existing[0].count >= MAX_SOURCES) {
          return { content: [{ type: 'text' as const, text: `Error: limit of ${MAX_SOURCES} sources reached. Remove a source before adding a new one.` }] };
        }

        // Check if source already exists by URL
        let [source] = await db
          .select()
          .from(sources)
          .where(eq(sources.url, url));

        if (!source) {
          // Validate and parse feed
          let feed;
          try {
            feed = await rssParser.parseURL(url);
          } catch {
            return { content: [{ type: 'text' as const, text: 'Error: URL is not a valid RSS/Atom feed.' }] };
          }

          [source] = await db.insert(sources).values({
            url,
            title: feed.title || url,
            siteUrl: feed.link || null,
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
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: source.id,
              title: source.title,
              url: source.url,
              siteUrl: source.siteUrl,
              category: category || null,
              subscriberCount: countRow.count,
            }, null, 2),
          }],
        };
      },
    );

    // ─── list_sources ───
    server.tool(
      'list_sources',
      'List all RSS sources for the user.',
      {},
      async (_params, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const result = await db
          .select({
            id: sources.id,
            title: sources.title,
            url: sources.url,
            siteUrl: sources.siteUrl,
            lastFetchedAt: sources.lastFetchedAt,
            category: userSources.category,
            subscriberCount: sql<number>`(SELECT count(*)::int FROM mcp_eloa.user_sources WHERE "sourceId" = ${sources.id})`,
          })
          .from(userSources)
          .innerJoin(sources, eq(userSources.sourceId, sources.id))
          .where(eq(userSources.userId, userId))
          .orderBy(desc(sources.createdAt));

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result, null, 2),
          }],
        };
      },
    );

    // ─── remove_source ───
    server.tool(
      'remove_source',
      'Remove an RSS source and all its associated articles for the user.',
      {
        sourceId: z.number().describe('Source ID to remove'),
      },
      async ({ sourceId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Verify subscription
        const [subscription] = await db
          .select()
          .from(userSources)
          .where(and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId)));
        if (!subscription) {
          return { content: [{ type: 'text' as const, text: 'Error: source not found.' }] };
        }

        // Get source title
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

        return {
          content: [{ type: 'text' as const, text: `Source "${source?.title || 'Source'}" removed. Its articles have been deleted.` }],
        };
      },
    );

    // ─── fetch_latest ───
    server.tool(
      'fetch_latest',
      'Fetch latest articles from RSS sources. Can filter by a specific source.',
      {
        sourceId: z.number().optional().describe('Source ID (optional, fetches all if omitted)'),
        limit: z.number().optional().default(20).describe('Max number of articles (default 20)'),
      },
      async ({ sourceId, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Get sources the user is subscribed to
        const sourceFilter = sourceId
          ? and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId))
          : eq(userSources.userId, userId);

        const subscriptions = await db
          .select({
            sourceId: sources.id,
            url: sources.url,
            title: sources.title,
          })
          .from(userSources)
          .innerJoin(sources, eq(userSources.sourceId, sources.id))
          .where(sourceFilter);

        if (subscriptions.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No sources registered.' }] };
        }

        const newArticles: Array<{ title: string; url: string; proxyUrl?: string; author?: string; publishedAt?: string; content?: string; source: string; isRead: boolean }> = [];

        for (const sub of subscriptions) {
          try {
            const feed = await rssParser.parseURL(sub.url);
            for (const item of feed.items || []) {
              if (!item.link) continue;

              const articleContent = item.contentSnippet || item.content || '';
              const [inserted] = await db
                .insert(articles)
                .values({
                  userId,
                  sourceId: sub.sourceId,
                  title: item.title || 'Untitled',
                  url: item.link,
                  shortCode: generateShortCode(),
                  author: item.creator || item.author || null,
                  content: articleContent,
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
                })
                .returning();

              newArticles.push({
                title: inserted.title,
                url: inserted.url,
                proxyUrl: inserted.shortCode ? `/r/${inserted.shortCode}` : undefined,
                author: inserted.author || undefined,
                publishedAt: inserted.publishedAt || undefined,
                content: articleContent.slice(0, 500),
                source: sub.title,
                isRead: inserted.isRead,
              });
            }

            // Update lastFetchedAt
            await db
              .update(sources)
              .set({ lastFetchedAt: new Date().toISOString() })
              .where(eq(sources.id, sub.sourceId));
          } catch {
            // Skip failed feeds silently
          }
        }

        // Sort by publishedAt desc and limit
        const sorted = newArticles
          .sort((a, b) => {
            const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
            const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
            return dateB - dateA;
          })
          .slice(0, limit);

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(sorted, null, 2),
          }],
        };
      },
    );

    // ─── mark_as_read ───
    server.tool(
      'mark_as_read',
      'Mark an article as read or unread.',
      {
        articleId: z.number().describe('Article ID'),
        read: z.boolean().optional().default(true).describe('true to mark as read, false for unread'),
      },
      async ({ articleId, read }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [article] = await db
          .select()
          .from(articles)
          .where(and(eq(articles.id, articleId), eq(articles.userId, userId)));
        if (!article) {
          return { content: [{ type: 'text' as const, text: 'Error: article not found.' }] };
        }

        await db
          .update(articles)
          .set({
            isRead: read,
            readAt: read ? new Date().toISOString() : null,
          })
          .where(and(eq(articles.id, articleId), eq(articles.userId, userId)));

        return {
          content: [{ type: 'text' as const, text: `Article "${article.title}" marked as ${read ? 'read' : 'unread'}.` }],
        };
      },
    );

    // ─── save_bookmark ───
    server.tool(
      'save_bookmark',
      'Save a URL as a bookmark. Auto-extracts the title if not provided.',
      {
        url: z.string().url().describe('URL to save'),
        title: z.string().optional().describe('Title (auto-extracted if omitted)'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
        notes: z.string().optional().describe('Personal notes'),
      },
      async ({ url, title, tags, notes }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

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
          tags: tags || null,
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

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              id: bookmark.id,
              title: bookmark.title,
              url: bookmark.url,
              tags: bookmark.tags,
              notes: bookmark.notes,
            }, null, 2),
          }],
        };
      },
    );

    // ─── list_bookmarks ───
    server.tool(
      'list_bookmarks',
      'List saved bookmarks. Filter by tag if provided.',
      {
        tag: z.string().optional().describe('Filter by tag'),
        limit: z.number().optional().default(20).describe('Max number of results (default 20)'),
      },
      async ({ tag, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        let query = db
          .select()
          .from(bookmarks)
          .where(
            tag
              ? and(eq(bookmarks.userId, userId), sql`${tag} = ANY(${bookmarks.tags})`)
              : eq(bookmarks.userId, userId),
          )
          .orderBy(desc(bookmarks.createdAt))
          .limit(limit);

        const result = await query;

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(result.map((b) => ({
              id: b.id,
              title: b.title,
              url: b.url,
              tags: b.tags,
              notes: b.notes,
              createdAt: b.createdAt,
            })), null, 2),
          }],
        };
      },
    );

    // ─── remove_bookmark ───
    server.tool(
      'remove_bookmark',
      'Remove a bookmark by ID.',
      {
        bookmarkId: z.number().describe('Bookmark ID to remove'),
      },
      async ({ bookmarkId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [bookmark] = await db
          .select()
          .from(bookmarks)
          .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
        if (!bookmark) {
          return { content: [{ type: 'text' as const, text: 'Error: bookmark not found.' }] };
        }

        await db.delete(bookmarks).where(eq(bookmarks.id, bookmarkId));

        return {
          content: [{ type: 'text' as const, text: `Bookmark "${bookmark.title}" removed.` }],
        };
      },
    );

    // ─── search_content ───
    server.tool(
      'search_content',
      'Search all saved content (articles + bookmarks) by keyword.',
      {
        query: z.string().describe('Search term'),
        type: z.enum(['articles', 'bookmarks', 'all']).optional().default('all').describe('Content type (default: all)'),
      },
      async ({ query, type }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);
        const results: Array<{ type: string; title: string; url: string; snippet: string; createdAt: string | null }> = [];

        try {
          const tsquery = sql`websearch_to_tsquery('simple', ${query})`;

          if (type === 'all' || type === 'articles') {
            const articleResults = await db
              .select({
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
                type: 'article',
                title: a.title,
                url: a.url,
                snippet: snippet + (snippet.length < text.length ? '...' : ''),
                createdAt: a.createdAt,
              });
            }
          }

          if (type === 'all' || type === 'bookmarks') {
            const bookmarkResults = await db
              .select({
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
                type: 'bookmark',
                title: b.title,
                url: b.url,
                snippet: snippet + (snippet.length < text.length ? '...' : ''),
                createdAt: b.createdAt,
              });
            }
          }
        } catch {
          return {
            content: [{ type: 'text' as const, text: '[]' }],
          };
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify(results.slice(0, 20), null, 2),
          }],
        };
      },
    );

    // ─── view_analytics ───
    server.tool(
      'view_analytics',
      'Show article click analytics: ranking of most clicked articles and clicks by source.',
      {
        period: z.enum(['7d', '30d', 'all']).optional().default('7d').describe('Period: 7d, 30d or all'),
        limit: z.number().optional().default(10).describe('Max number of articles in ranking'),
      },
      async ({ period, limit }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const userFilter = eq(articles.userId, userId);

        let dateFilter = sql`1=1`;
        if (period !== 'all') {
          const since = new Date();
          if (period === '7d') since.setDate(since.getDate() - 7);
          else if (period === '30d') since.setDate(since.getDate() - 30);
          dateFilter = gte(linkClicks.clickedAt, since.toISOString());
        }

        const topArticles = await db
          .select({
            title: articles.title,
            url: articles.url,
            shortCode: articles.shortCode,
            clickCount: sql<number>`count(*)::int`,
            lastClickedAt: sql<string>`max(${linkClicks.clickedAt})`,
          })
          .from(linkClicks)
          .innerJoin(articles, eq(linkClicks.articleId, articles.id))
          .where(and(userFilter, dateFilter))
          .groupBy(articles.id)
          .orderBy(sql`count(*) DESC`)
          .limit(limit);

        const bySource = await db
          .select({
            sourceTitle: sql<string>`(SELECT title FROM mcp_eloa.sources WHERE id = ${articles.sourceId})`,
            clickCount: sql<number>`count(*)::int`,
          })
          .from(linkClicks)
          .innerJoin(articles, eq(linkClicks.articleId, articles.id))
          .where(and(userFilter, dateFilter))
          .groupBy(articles.sourceId)
          .orderBy(sql`count(*) DESC`);

        const [totalRow] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(linkClicks)
          .innerJoin(articles, eq(linkClicks.articleId, articles.id))
          .where(and(userFilter, dateFilter));

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({
              period,
              totalClicks: totalRow.count,
              topArticles,
              clicksBySource: bySource,
            }, null, 2),
          }],
        };
      },
    );

    // ─── extract_content ───
    server.tool(
      'extract_content',
      'Extract full content from a URL via scrape API or direct fetch.',
      {
        url: z.string().url().describe('URL to extract content from'),
        bookmarkId: z.number().optional().describe('Bookmark ID to update content'),
        articleId: z.number().optional().describe('Article ID to update content'),
      },
      async ({ url, bookmarkId, articleId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        let title = '';
        let content = '';
        let description = '';

        const scrapeApiUrl = process.env.SCRAPE_API_URL;
        const scrapeApiKey = process.env.SCRAPE_API_KEY;

        if (scrapeApiUrl && scrapeApiKey) {
          // Use scrape API
          try {
            const res = await fetch(scrapeApiUrl, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${scrapeApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url }),
            });
            const data = await res.json();
            title = data.title || '';
            content = data.content || data.text || '';
            description = data.description || '';
          } catch {
            // Fall through to direct fetch
          }
        }

        if (!content) {
          // Fallback: direct fetch + HTML strip
          try {
            const res = await fetch(url);
            const html = await res.text();
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            title = titleMatch ? titleMatch[1].trim() : '';
            const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
            description = descMatch ? descMatch[1].trim() : '';
            // Strip HTML tags for content
            content = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 10000);
          } catch {
            return { content: [{ type: 'text' as const, text: 'Error: could not access the URL.' }] };
          }
        }

        // Update bookmark or article if requested
        if (bookmarkId) {
          await db
            .update(bookmarks)
            .set({ content, summary: description })
            .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
        }
        if (articleId) {
          await db
            .update(articles)
            .set({ content, summary: description })
            .where(and(eq(articles.id, articleId), eq(articles.userId, userId)));
        }

        return {
          content: [{
            type: 'text' as const,
            text: JSON.stringify({ title, description, content: content.slice(0, 2000) }, null, 2),
          }],
        };
      },
    );
  },
};
