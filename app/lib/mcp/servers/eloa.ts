import { z } from 'zod';
import { eq, and, sql, desc, gte } from 'drizzle-orm';
import RssParser from 'rss-parser';
import { db } from '../../db';
import { getUserId } from '../auth-helpers';
import { sources, userSources, articles, bookmarks, linkClicks } from './eloa.schema';
import { generateShortCode } from '../../short-code';
import { toolError } from '../errors';
import type { McpServerDefinition } from '../types';

const MAX_SOURCES = 20;
const rssParser = new RssParser();

export const eloaServer: McpServerDefinition = {
  name: 'eloa',
  description:
    'Eloa — AI Content Curator: manage RSS sources, bookmarks and search across all your saved content',
  category: 'Content Tools',
  icon: '/eloa.png',
  instructions: `# Eloa — AI Content Curator

## Purpose
Eloa helps you manage RSS/Atom feeds and bookmarks. Subscribe to feeds, fetch and read articles, save bookmarks with tags, search across everything, and track link clicks.

## Key Concepts
- **Source**: An RSS/Atom feed URL you subscribe to. Maximum 20 sources per user.
- **Article**: An entry fetched from an RSS source. Has read/unread status and a trackable proxy URL.
- **Bookmark**: A manually saved URL with optional tags and notes. Content is auto-extracted for full-text search.
- **Short Code**: A trackable proxy URL (\`/r/<code>\`) generated for each article. Clicks are counted for analytics.

## Typical Workflows
1. **Add & Fetch**: \`add_source\` → \`fetch_latest\` → \`mark_as_read\`
2. **Bookmark & Search**: \`save_bookmark\` → \`search_content\`
3. **Deep Read**: \`search_content\` → \`extract_content\` (get full text of a result)
4. **Analytics**: \`view_analytics\` to see which articles get the most clicks

## Conventions
- IDs are numeric integers returned by list/fetch tools.
- Search uses PostgreSQL \`websearch_to_tsquery\` — supports natural language queries.
- Tags are string arrays, lowercase recommended.
- All destructive operations require an ID from a list/fetch tool first.`,
  tools: [
    {
      name: 'add_source',
      description: 'Subscribe to an RSS/Atom feed. Validates the URL is a parseable feed, auto-extracts the title, and saves it. Use when the user shares a blog or news URL they want to follow. Limit: 20 sources per user. Idempotent — adding the same URL twice creates only one subscription.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'list_sources',
      description: 'List all RSS/Atom sources the user is subscribed to. Returns source ID, title, URL, site URL, last fetch timestamp, category, and subscriber count. Use to show the user their feeds or to get a sourceId for fetch_latest or remove_source. Read-only.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'remove_source',
      description: 'Unsubscribe from an RSS source and delete all articles fetched from it for this user. Requires sourceId from list_sources. Destructive — articles from this source are permanently deleted. If no other user subscribes, the source record is also removed.',
      annotations: { destructiveHint: true },
    },
    {
      name: 'fetch_latest',
      description: 'Fetch the latest articles from RSS feeds. Parses each feed, upserts articles into the database, and returns them sorted by date. Optionally filter by sourceId. Each article gets a trackable short code URL. Returns array of article objects with title, URL, proxyUrl, author, date, content snippet, source name, and read status.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'save_bookmark',
      description: 'Save a URL as a bookmark with optional tags and notes. Auto-extracts the page title and meta description if not provided. Stores stripped HTML content (up to 10KB) for full-text search. Idempotent — saving the same URL twice updates the existing bookmark.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'list_bookmarks',
      description: 'List saved bookmarks, optionally filtered by a single tag. Returns bookmark ID, title, URL, tags, notes, and creation date, ordered by newest first. Use to browse bookmarks or get a bookmarkId for remove_bookmark. Read-only.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'remove_bookmark',
      description: 'Permanently delete a bookmark by its ID. Requires bookmarkId from list_bookmarks. Destructive — the bookmark and its content are permanently removed.',
      annotations: { destructiveHint: true },
    },
    {
      name: 'mark_as_read',
      description: 'Toggle the read status of an article. Use after the user has read or wants to un-read an article. Requires articleId from fetch_latest or search_content. Idempotent — setting read=true on an already-read article is a no-op.',
      annotations: { idempotentHint: true },
    },
    {
      name: 'search_content',
      description: 'Full-text search across all saved articles and bookmarks using PostgreSQL websearch_to_tsquery. Supports natural language queries. Filter by type: articles, bookmarks, or all. Returns up to 20 results with title, URL, snippet, and creation date. Read-only.',
      annotations: { readOnlyHint: true },
    },
    {
      name: 'extract_content',
      description: 'Fetch and extract the full text content from a URL. Uses a scrape API if configured, otherwise falls back to direct HTML fetch with tag stripping. Optionally updates the content of an existing bookmark or article by providing bookmarkId or articleId.',
    },
    {
      name: 'view_analytics',
      description: 'Show click analytics for articles: top clicked articles ranking and clicks grouped by source. Filter by period: 7d, 30d, or all. Uses the trackable proxy URLs (short codes) to count clicks. Read-only.',
      annotations: { readOnlyHint: true },
    },
  ],
  init: (server) => {
    // ─── add_source ───
    server.tool(
      'add_source',
      'Subscribe to an RSS/Atom feed. Validates the URL is a parseable feed, auto-extracts the title, and saves it. Use when the user shares a blog or news URL they want to follow. Limit: 20 sources per user. Returns source object with subscriber count. Idempotent — adding the same URL twice creates only one subscription.',
      {
        url: z.string().url().describe('RSS/Atom feed URL'),
        category: z.string().optional().describe('Source category (e.g. tech, design, news)'),
      },
      { idempotentHint: true },
      async ({ url, category }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Check subscription limit
        const existing = await db
          .select({ count: sql<number>`count(*)` })
          .from(userSources)
          .where(eq(userSources.userId, userId));
        if (existing[0].count >= MAX_SOURCES) {
          return toolError(
            'Source limit reached (20/20).',
            'Remove an existing source with remove_source before adding a new one. Use list_sources to see your current sources.',
          );
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
            return toolError(
              'URL is not a valid RSS/Atom feed.',
              'Verify the URL points to an RSS or Atom feed (usually ends in /feed, /rss, or /atom.xml). Try the site\'s main URL — many sites have a /feed path.',
            );
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
      'List all RSS/Atom sources the user is subscribed to. Returns source ID, title, URL, site URL, last fetch timestamp, category, and subscriber count. Use to show the user their feeds or to get a sourceId for fetch_latest or remove_source. Read-only.',
      {},
      { readOnlyHint: true },
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
      'Unsubscribe from an RSS source and delete all articles fetched from it for this user. Requires sourceId from list_sources. Destructive — articles from this source are permanently deleted. If no other user subscribes, the source record is also removed.',
      {
        sourceId: z.number().describe('Numeric source ID — get from list_sources'),
      },
      { destructiveHint: true },
      async ({ sourceId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        // Verify subscription
        const [subscription] = await db
          .select()
          .from(userSources)
          .where(and(eq(userSources.sourceId, sourceId), eq(userSources.userId, userId)));
        if (!subscription) {
          return toolError(
            'Source not found or you are not subscribed to it.',
            'Use list_sources to see your current sources and their IDs.',
          );
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
      'Fetch the latest articles from RSS feeds. Parses each feed, upserts articles into the database, and returns them sorted by date. Optionally filter by sourceId. Each article gets a trackable short code URL. Side effect: updates source lastFetchedAt. Returns array of article objects with title, URL, proxyUrl, author, date, content snippet (500 chars), source name, and read status.',
      {
        sourceId: z.number().optional().describe('Numeric source ID — get from list_sources'),
        limit: z.number().optional().default(20).describe('Max results to return (default: 20, max: 100)'),
      },
      { idempotentHint: true },
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
          return toolError(
            'No sources registered.',
            'Add a source first with add_source, then fetch articles.',
          );
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
          } catch (err) {
            console.error(`[Eloa] Failed to fetch feed "${sub.url}":`, err);
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
      'Toggle the read status of an article. Use after the user has read or wants to un-read an article. Requires articleId from fetch_latest or search_content. Idempotent — setting read=true on an already-read article is a no-op.',
      {
        articleId: z.number().describe('Numeric article ID — get from fetch_latest or search_content'),
        read: z.boolean().optional().default(true).describe('true to mark as read, false for unread'),
      },
      { idempotentHint: true },
      async ({ articleId, read }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [article] = await db
          .select()
          .from(articles)
          .where(and(eq(articles.id, articleId), eq(articles.userId, userId)));
        if (!article) {
          return toolError(
            'Article not found.',
            'Use fetch_latest or search_content to find articles and their IDs.',
          );
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
      'Save a URL as a bookmark with optional tags and notes. Auto-extracts the page title and meta description if not provided. Stores stripped HTML content (up to 10KB) for full-text search. Idempotent — saving the same URL twice updates the existing bookmark. Returns bookmark object with ID, title, URL, tags, and notes.',
      {
        url: z.string().url().describe('URL to save'),
        title: z.string().optional().describe('Title (auto-extracted if omitted)'),
        tags: z.array(z.string()).optional().describe('Tags for categorization'),
        notes: z.string().optional().describe('Personal notes'),
      },
      { idempotentHint: true },
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
        } catch (err) {
          console.error(`[Eloa] Failed to fetch bookmark URL "${url}":`, err);
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
      'List saved bookmarks, optionally filtered by a single tag. Returns bookmark ID, title, URL, tags, notes, and creation date, ordered by newest first. Use to browse bookmarks or get a bookmarkId for remove_bookmark. Read-only.',
      {
        tag: z.string().optional().describe('Filter by tag'),
        limit: z.number().optional().default(20).describe('Max results to return (default: 20, max: 100)'),
      },
      { readOnlyHint: true },
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
      'Permanently delete a bookmark by its ID. Requires bookmarkId from list_bookmarks. Destructive — the bookmark and its content are permanently removed.',
      {
        bookmarkId: z.number().describe('Numeric bookmark ID — get from list_bookmarks'),
      },
      { destructiveHint: true },
      async ({ bookmarkId }, extra) => {
        const userId = getUserId(extra as Record<string, unknown>);

        const [bookmark] = await db
          .select()
          .from(bookmarks)
          .where(and(eq(bookmarks.id, bookmarkId), eq(bookmarks.userId, userId)));
        if (!bookmark) {
          return toolError(
            'Bookmark not found.',
            'Use list_bookmarks to see your bookmarks and their IDs.',
          );
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
      'Full-text search across all saved articles and bookmarks using PostgreSQL websearch_to_tsquery. Supports natural language queries like "react hooks tutorial". Filter by type: articles, bookmarks, or all. Returns up to 20 results with title, URL, snippet (150 chars), and creation date. Read-only.',
      {
        query: z.string().describe('Search query — supports natural language, e.g. "react hooks tutorial"'),
        type: z.enum(['articles', 'bookmarks', 'all']).optional().default('all').describe('Filter content type: "articles", "bookmarks", or "all" (default: "all")'),
      },
      { readOnlyHint: true },
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
        } catch (err) {
          console.error('[Eloa] Search failed:', err);
          return toolError(
            'Search failed — the query may contain unsupported syntax.',
            'Try simpler search terms without special characters.',
          );
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
      'Show click analytics for articles: top clicked articles ranking and clicks grouped by source. Filter by period: 7d, 30d, or all. Uses the trackable proxy URLs (short codes) to count clicks. Returns totalClicks, topArticles array, and clicksBySource array. Read-only.',
      {
        period: z.enum(['7d', '30d', 'all']).optional().default('7d').describe('Time period: "7d" (last 7 days), "30d" (last 30 days), or "all" (all time)'),
        limit: z.number().optional().default(10).describe('Max results to return (default: 20, max: 100)'),
      },
      { readOnlyHint: true },
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
      'Fetch and extract the full text content from a URL. Uses a scrape API if configured, otherwise falls back to direct HTML fetch with tag stripping. Optionally updates the content of an existing bookmark or article by providing bookmarkId or articleId. Returns title, description, and content (truncated to 2000 chars in response, full content saved to DB).',
      {
        url: z.string().url().describe('URL to extract content from'),
        bookmarkId: z.number().optional().describe('Numeric bookmark ID — get from list_bookmarks'),
        articleId: z.number().optional().describe('Numeric article ID — get from fetch_latest or search_content'),
      },
      { },
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
          } catch (err) {
            console.error(`[Eloa] Scrape API failed for "${url}":`, err);
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
            return toolError(
              'Could not access the URL.',
              'Verify the URL is publicly accessible and not behind a login wall.',
            );
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
