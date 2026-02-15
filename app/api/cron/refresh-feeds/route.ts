import { db } from '@/app/lib/db';
import { sources, userSources, articles } from '@/app/lib/mcp/servers/eloa.schema';
import { eq, sql } from 'drizzle-orm';
import { generateShortCode } from '@/app/lib/short-code';
import RssParser from 'rss-parser';

const rssParser = new RssParser();

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Each URL appears only once in sources (shared)
  const allSources = await db.select().from(sources);

  let updated = 0;
  let failed = 0;
  const errors: Array<{ url: string; error: string }> = [];

  for (const source of allSources) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(source.url, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Eloa/1.0 (RSS Reader)' },
      });
      clearTimeout(timeout);
      const text = await res.text();
      const feed = await rssParser.parseString(text);

      // Get all subscribers for this source
      const subscribers = await db
        .select({ userId: userSources.userId })
        .from(userSources)
        .where(eq(userSources.sourceId, source.id));

      for (const item of feed.items || []) {
        if (!item.link) continue;
        // Insert article for each subscriber
        for (const sub of subscribers) {
          await db
            .insert(articles)
            .values({
              userId: sub.userId,
              sourceId: source.id,
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
        }
      }

      await db
        .update(sources)
        .set({ lastFetchedAt: new Date().toISOString() })
        .where(eq(sources.id, source.id));

      updated++;
    } catch (err) {
      failed++;
      errors.push({
        url: source.url,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return Response.json({ ok: true, updated, failed, total: allSources.length, errors });
}
